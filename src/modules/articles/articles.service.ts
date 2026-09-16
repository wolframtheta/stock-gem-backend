import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Article } from './entities/article.entity';
import { ArticlePhoto } from './entities/article-photo.entity';
import { ArticleSize } from './entities/article-size.entity';
import { ArticleSizeStock } from './entities/article-size-stock.entity';
import { ArticlePriceHistory } from './entities/article-price-history.entity';
import { ArticleStockHistory } from './entities/article-stock-history.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { SearchArticleDto } from './dto/search-article.dto';
import { AddStockDto } from './dto/add-stock.dto';
import { ArticleSizeInputDto } from './dto/article-size-input.dto';
import { shouldRecordPriceHistory } from './articles-pricing.util';
import {
  assertCanDeleteSize,
  assertHasSizesBlocked,
  assertStockWritable,
  DEFAULT_MIGRATION_SIZE_LABEL,
  normalizeSizeLabel,
  sumWarehouseQuantities,
  validateUniqueSizeLabels,
} from './articles-sizes.util';
import { SalesPointStock } from '../sales-points/entities/sales-point-stock.entity';
import { SalesPointSizeStock } from '../sales-points/entities/sales-point-size-stock.entity';
import { FairStock } from '../fairs/entities/fair-stock.entity';
import { FairSizeStock } from '../fairs/entities/fair-size-stock.entity';
import { Collection } from '../config/entities/collection.entity';
import { ArticleType } from '../config/entities/article-type.entity';
import { SalesPointsService } from '../sales-points/sales-points.service';
import { User, UserRole } from '../auth/entities/user.entity';

export type ArticleSizeResponse = {
  id: string;
  label: string;
  sortOrder: number;
  warehouseQuantity: number;
};

export type ArticleWithFairQty = Omit<Article, 'sizes'> & {
  quantityAtFair?: number;
  sizes?: ArticleSizeResponse[];
};

export interface StockBreakdown {
  total: number;
  bySalesPoint: {
    salesPointId: string;
    salesPointCode: string;
    salesPointName: string;
    quantity: number;
  }[];
  byFair: {
    fairId: string;
    fairName: string;
    quantity: number;
  }[];
  unassigned: number;
}

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    @InjectRepository(ArticlePhoto)
    private articlePhotoRepository: Repository<ArticlePhoto>,
    @InjectRepository(ArticleSize)
    private articleSizeRepository: Repository<ArticleSize>,
    @InjectRepository(ArticleSizeStock)
    private articleSizeStockRepository: Repository<ArticleSizeStock>,
    @InjectRepository(ArticlePriceHistory)
    private priceHistoryRepository: Repository<ArticlePriceHistory>,
    @InjectRepository(ArticleStockHistory)
    private stockHistoryRepository: Repository<ArticleStockHistory>,
    @InjectRepository(SalesPointStock)
    private salesPointStockRepository: Repository<SalesPointStock>,
    @InjectRepository(FairStock)
    private fairStockRepository: Repository<FairStock>,
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>,
    @InjectRepository(ArticleType)
    private articleTypeRepository: Repository<ArticleType>,
    private salesPointsService: SalesPointsService,
  ) {}

  async create(createArticleDto: CreateArticleDto): Promise<ArticleWithFairQty> {
    const hasSizes = createArticleDto.hasSizes ?? false;
    assertStockWritable(hasSizes, createArticleDto.stock);

    if (hasSizes && !createArticleDto.sizes?.length) {
      throw new BadRequestException(
        'Article amb talles requereix almenys una talla',
      );
    }

    const existingArticle = await this.articleRepository.findOne({
      where: { ownReference: createArticleDto.ownReference },
    });

    if (existingArticle) {
      throw new ConflictException(
        'El artículo con esta referencia propia ya existe',
      );
    }

    let collection: Collection | null = null;
    if (createArticleDto.collectionId) {
      collection = await this.collectionRepository.findOne({
        where: { id: createArticleDto.collectionId },
      });
      if (!collection) {
        throw new NotFoundException(
          `Col·lecció amb ID ${createArticleDto.collectionId} no trobada`,
        );
      }
    }

    let articleType: ArticleType | null = null;
    if (createArticleDto.articleTypeId) {
      articleType = await this.articleTypeRepository.findOne({
        where: { id: createArticleDto.articleTypeId },
      });
      if (!articleType) {
        throw new NotFoundException(
          `Tipus de peça amb ID ${createArticleDto.articleTypeId} no trobat`,
        );
      }
    }

    const { photoPaths, photo, sizes, hasSizes: _hs, ...articleData } =
      createArticleDto;
    const primaryPhoto = photoPaths?.[0] ?? photo ?? null;

    const article = this.articleRepository.create({
      ...articleData,
      cost: createArticleDto.cost ?? null,
      stock: hasSizes ? 0 : (createArticleDto.stock ?? 0),
      hasSizes,
      photo: primaryPhoto,
      collection: collection || null,
      articleType: articleType || null,
    });

    const saved = await this.articleRepository.save(article);

    if (photoPaths !== undefined) {
      await this.syncArticlePhotos(saved.id, photoPaths);
    } else if (primaryPhoto) {
      await this.syncArticlePhotos(saved.id, [primaryPhoto]);
    }

    if (saved.pvp > 0) {
      await this.priceHistoryRepository.save(
        this.priceHistoryRepository.create({
          articleId: saved.id,
          price: saved.pvp,
          changedAt: new Date(),
        }),
      );
    }

    if (hasSizes) {
      await this.syncArticleSizes(saved.id, sizes!);
    } else if (saved.stock > 0) {
      const warehouse = await this.salesPointsService.getDefaultWarehouse();
      if (warehouse) {
        const currentAtWarehouse =
          await this.salesPointsService.getStockAtPoint(warehouse.id, saved.id);
        await this.salesPointsService.assignStock(warehouse.id, {
          articleId: saved.id,
          quantity: currentAtWarehouse + saved.stock,
        });
      }
    }

    return this.findOne(saved.id);
  }

  private isBotigaWithFair(user: User): boolean {
    return user.role === UserRole.BOTIGA && !!user.fairId;
  }

  async findAll(user: User): Promise<ArticleWithFairQty[]> {
    if (user.role === UserRole.BOTIGA) {
      if (!user.fairId) return [];
      return this.findAllForFair(user.fairId);
    }
    const articles = await this.articleRepository.find({
      relations: ['collection', 'articleType'],
      order: { ownReference: 'ASC' },
    });
    return articles.map((a) => this.enrichArticleResponse(a));
  }

  private async findAllForFair(fairId: string): Promise<ArticleWithFairQty[]> {
    const stockRows = await this.fairStockRepository
      .createQueryBuilder('fs')
      .innerJoinAndSelect('fs.article', 'a')
      .leftJoinAndSelect('a.collection', 'collection')
      .leftJoinAndSelect('a.articleType', 'articleType')
      .where('fs.fair_id = :fairId', { fairId })
      .orderBy('a.own_reference', 'ASC')
      .getMany();
    return stockRows.map((fs) => {
      const enriched = this.enrichArticleResponse(fs.article);
      enriched.quantityAtFair = fs.quantity;
      return enriched;
    });
  }

  async findOne(id: string, user?: User): Promise<ArticleWithFairQty> {
    if (user?.role === UserRole.BOTIGA) {
      if (!user.fairId)
        throw new NotFoundException(`Article with ID ${id} not found`);
      return this.findOneForFair(id, user.fairId);
    }
    const article = await this.articleRepository.findOne({
      where: { id },
      relations: ['collection', 'articleType', 'photos', 'sizes', 'sizes.sizeStock'],
    });
    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }
    return this.enrichArticleResponse(this.sortArticlePhotos(article));
  }

  private async findOneForFair(
    id: string,
    fairId: string,
  ): Promise<ArticleWithFairQty> {
    const fairStock = await this.fairStockRepository.findOne({
      where: { fairId, articleId: id },
      relations: ['article', 'article.collection', 'article.articleType'],
    });
    if (!fairStock) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }
    const withRelations = await this.articleRepository.findOne({
      where: { id: fairStock.article.id },
      relations: [
        'collection',
        'articleType',
        'photos',
        'sizes',
        'sizes.sizeStock',
      ],
    });
    const enriched = this.enrichArticleResponse(
      this.sortArticlePhotos(withRelations ?? fairStock.article),
    );
    enriched.quantityAtFair = fairStock.quantity;
    return enriched;
  }

  private sortArticlePhotos<T extends Article>(article: T): T {
    if (article.photos?.length) {
      article.photos.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return article;
  }

  private enrichArticleResponse(article: Article): ArticleWithFairQty {
    const result = { ...article } as unknown as ArticleWithFairQty;
    if (!article.hasSizes) {
      result.sizes = [];
      return result;
    }
    result.sizes = (article.sizes ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({
        id: s.id,
        label: s.label,
        sortOrder: s.sortOrder,
        warehouseQuantity: s.sizeStock?.quantity ?? 0,
      }));
    return result;
  }

  private async syncArticlePhotos(
    articleId: string,
    paths: string[],
  ): Promise<void> {
    await this.articlePhotoRepository.delete({ articleId });
    if (paths.length === 0) {
      return;
    }
    const rows = paths.map((path, index) =>
      this.articlePhotoRepository.create({
        articleId,
        path,
        sortOrder: index,
      }),
    );
    await this.articlePhotoRepository.save(rows);
  }

  private async getTotalQtyForSize(
    articleSizeId: string,
    em: EntityManager,
  ): Promise<number> {
    const stockRepo = em.getRepository(ArticleSizeStock);
    const spSizeRepo = em.getRepository(SalesPointSizeStock);
    const fairSizeRepo = em.getRepository(FairSizeStock);

    const warehouse = await stockRepo.findOne({ where: { articleSizeId } });
    const spResult = await spSizeRepo
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.quantity), 0)', 'total')
      .where('s.article_size_id = :articleSizeId', { articleSizeId })
      .getRawOne();
    const fairResult = await fairSizeRepo
      .createQueryBuilder('f')
      .select('COALESCE(SUM(f.quantity), 0)', 'total')
      .where('f.article_size_id = :articleSizeId', { articleSizeId })
      .getRawOne();

    return (
      Number(warehouse?.quantity ?? 0) +
      Number(spResult?.total ?? 0) +
      Number(fairResult?.total ?? 0)
    );
  }

  private async assertCanActivateHasSizes(articleId: string): Promise<void> {
    const breakdown = await this.getStockBreakdown(articleId);
    if (breakdown.unassigned > 0) {
      throw new ConflictException(
        'No es pot activar talles: hi ha stock no assignat. Assigna tot al magatzem abans.',
      );
    }
    if (breakdown.byFair.some((f) => f.quantity > 0)) {
      throw new ConflictException(
        'No es pot activar talles amb stock assignat a fires',
      );
    }
    const warehouse = await this.salesPointsService.getDefaultWarehouse();
    if (warehouse) {
      const outside = breakdown.bySalesPoint
        .filter((sp) => sp.salesPointId !== warehouse.id)
        .reduce((sum, sp) => sum + sp.quantity, 0);
      if (outside > 0) {
        throw new ConflictException(
          'No es pot activar talles amb stock assignat a punts de venda',
        );
      }
      const warehouseQty =
        breakdown.bySalesPoint.find(
          (sp) => sp.salesPointId === warehouse.id,
        )?.quantity ?? 0;
      if (warehouseQty < breakdown.total) {
        throw new ConflictException(
          "No es pot activar talles: tot el stock ha d'estar al magatzem",
        );
      }
    }
  }

  private async assertCanDeactivateHasSizes(articleId: string): Promise<void> {
    const sizes = await this.articleSizeRepository.find({
      where: { articleId },
    });
    for (const size of sizes) {
      const total = await this.getTotalQtyForSize(
        size.id,
        this.articleRepository.manager,
      );
      if (total > 0) {
        throw new ConflictException(
          'No es pot desactivar talles mentre hi hagi stock per talla',
        );
      }
    }
  }

  private async syncArticleSizes(
    articleId: string,
    sizesInput: ArticleSizeInputDto[],
  ): Promise<number> {
    return this.articleRepository.manager.transaction(async (em) => {
      await em.findOne(Article, {
        where: { id: articleId },
        lock: { mode: 'pessimistic_write' },
      });

      const sizeRepo = em.getRepository(ArticleSize);
      const stockRepo = em.getRepository(ArticleSizeStock);
      const spSizeRepo = em.getRepository(SalesPointSizeStock);
      const fairSizeRepo = em.getRepository(FairSizeStock);

      const normalized = sizesInput.map((s, index) => ({
        id: s.id,
        label: normalizeSizeLabel(s.label),
        warehouseQuantity: Math.max(0, Number(s.warehouseQuantity ?? 0)),
        sortOrder: s.sortOrder ?? index,
      }));

      validateUniqueSizeLabels(normalized.map((s) => s.label));

      const existing = await sizeRepo.find({
        where: { articleId },
        relations: ['sizeStock'],
      });
      const existingById = new Map(existing.map((s) => [s.id, s]));

      for (const input of normalized) {
        if (input.id && !existingById.has(input.id)) {
          throw new BadRequestException("Talla no pertany a l'article");
        }
      }

      const keptIds = new Set<string>();

      for (const input of normalized) {
        let size: ArticleSize;
        if (input.id) {
          size = existingById.get(input.id)!;
          size.label = input.label;
          size.sortOrder = input.sortOrder;
          size = await sizeRepo.save(size);
        } else {
          size = sizeRepo.create({
            articleId,
            label: input.label,
            sortOrder: input.sortOrder,
          });
          size = await sizeRepo.save(size);
        }
        keptIds.add(size.id);

        let sizeStock = await stockRepo.findOne({
          where: { articleSizeId: size.id },
        });
        if (!sizeStock) {
          sizeStock = stockRepo.create({
            articleSizeId: size.id,
            quantity: input.warehouseQuantity,
          });
        } else {
          sizeStock.quantity = input.warehouseQuantity;
        }
        await stockRepo.save(sizeStock);
      }

      for (const old of existing) {
        if (keptIds.has(old.id)) continue;
        const totalQty = await this.getTotalQtyForSize(old.id, em);
        assertCanDeleteSize(totalQty);
        await stockRepo.delete({ articleSizeId: old.id });
        await spSizeRepo.delete({ articleSizeId: old.id });
        await fairSizeRepo.delete({ articleSizeId: old.id });
        await sizeRepo.delete({ id: old.id });
      }

      const total = sumWarehouseQuantities(
        normalized.map((s) => ({ warehouseQuantity: s.warehouseQuantity })),
      );

      await em.update(
        Article,
        { id: articleId },
        { stock: total, hasSizes: true },
      );

      const warehouse = await this.salesPointsService.getDefaultWarehouse();
      if (warehouse) {
        await this.salesPointsService.assignStock(warehouse.id, {
          articleId,
          quantity: total,
        });
      }

      return total;
    });
  }

  async update(
    id: string,
    updateArticleDto: UpdateArticleDto,
  ): Promise<ArticleWithFairQty> {
    const article = await this.articleRepository.findOne({
      where: { id },
      relations: ['collection', 'articleType'],
    });
    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    const newHasSizes =
      updateArticleDto.hasSizes !== undefined
        ? updateArticleDto.hasSizes
        : article.hasSizes;

    assertStockWritable(newHasSizes, updateArticleDto.stock);

    const turningOn = !article.hasSizes && newHasSizes === true;
    const turningOff = article.hasSizes && newHasSizes === false;

    if (turningOn) {
      await this.assertCanActivateHasSizes(id);
    }
    if (turningOff) {
      await this.assertCanDeactivateHasSizes(id);
    }

    if (
      updateArticleDto.ownReference &&
      updateArticleDto.ownReference !== article.ownReference
    ) {
      const existingArticle = await this.articleRepository.findOne({
        where: { ownReference: updateArticleDto.ownReference },
      });

      if (existingArticle) {
        throw new ConflictException(
          'El artículo con esta referencia propia ya existe',
        );
      }
    }

    if (updateArticleDto.collectionId !== undefined) {
      if (updateArticleDto.collectionId === null) {
        article.collection = null;
        article.collectionId = null;
      } else {
        const c = await this.collectionRepository.findOne({
          where: { id: updateArticleDto.collectionId },
        });
        if (!c) throw new NotFoundException('Col·lecció no trobada');
        article.collection = c;
        article.collectionId = c.id;
      }
    }

    if (updateArticleDto.articleTypeId !== undefined) {
      if (updateArticleDto.articleTypeId === null) {
        article.articleType = null;
        article.articleTypeId = null;
      } else {
        const t = await this.articleTypeRepository.findOne({
          where: { id: updateArticleDto.articleTypeId },
        });
        if (!t) throw new NotFoundException('Tipus de peça no trobat');
        article.articleType = t;
        article.articleTypeId = t.id;
      }
    }

    const oldPvp = article.pvp;
    const { photoPaths, photo, sizes, hasSizes, stock, ...updateData } =
      updateArticleDto;

    if (photoPaths !== undefined) {
      article.photo = photoPaths[0] ?? null;
      await this.syncArticlePhotos(id, photoPaths);
    } else if (photo !== undefined) {
      article.photo = photo ?? null;
      if (photo) {
        await this.syncArticlePhotos(id, [photo]);
      } else {
        await this.syncArticlePhotos(id, []);
      }
    }

    Object.assign(article, {
      ...updateData,
      collectionId: undefined,
      articleTypeId: undefined,
    });

    if (turningOff) {
      article.hasSizes = false;
      await this.articleSizeRepository.delete({ articleId: id });
    } else if (turningOn) {
      article.hasSizes = true;
      let sizesInput = sizes;
      if (!sizesInput?.length && article.stock > 0) {
        sizesInput = [
          {
            label: DEFAULT_MIGRATION_SIZE_LABEL,
            warehouseQuantity: article.stock,
          },
        ];
      } else if (!sizesInput?.length) {
        throw new BadRequestException(
          'Article amb talles requereix almenys una talla',
        );
      }
      article.stock = await this.syncArticleSizes(id, sizesInput);
    } else if (article.hasSizes && sizes !== undefined) {
      article.stock = await this.syncArticleSizes(id, sizes);
    } else if (!article.hasSizes && stock !== undefined) {
      article.stock = Number(stock);
      const warehouse = await this.salesPointsService.getDefaultWarehouse();
      if (warehouse) {
        const assignedElsewhere =
          (await this.getAssignedOutsideWarehouse(id, warehouse.id)) ?? 0;
        const newWarehouseQty = Math.max(0, article.stock - assignedElsewhere);
        await this.salesPointsService.assignStock(warehouse.id, {
          articleId: id,
          quantity: newWarehouseQty,
        });
      }
    }

    const saved = await this.articleRepository.save(article);

    if (
      updateArticleDto.pvp !== undefined &&
      shouldRecordPriceHistory(oldPvp, Number(updateArticleDto.pvp))
    ) {
      await this.priceHistoryRepository.save(
        this.priceHistoryRepository.create({
          articleId: saved.id,
          price: saved.pvp,
          changedAt: new Date(),
        }),
      );
    }

    return this.findOne(id);
  }

  private async getAssignedOutsideWarehouse(
    articleId: string,
    warehouseId: string,
  ): Promise<number> {
    const [pointsResult, fairsResult] = await Promise.all([
      this.salesPointStockRepository
        .createQueryBuilder('sps')
        .select('COALESCE(SUM(sps.quantity), 0)', 'total')
        .where('sps.article_id = :articleId', { articleId })
        .andWhere('sps.sales_point_id != :warehouseId', { warehouseId })
        .getRawOne(),
      this.fairStockRepository
        .createQueryBuilder('fs')
        .select('COALESCE(SUM(fs.quantity), 0)', 'total')
        .where('fs.article_id = :articleId', { articleId })
        .getRawOne(),
    ]);
    const atPoints = Number(pointsResult?.total ?? 0);
    const atFairs = Number(fairsResult?.total ?? 0);
    return atPoints + atFairs;
  }

  async remove(id: string): Promise<void> {
    const article = await this.articleRepository.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }
    await this.articleRepository.remove(article);
  }

  async search(
    searchDto: SearchArticleDto,
    user: User,
  ): Promise<ArticleWithFairQty[]> {
    if (user.role === UserRole.BOTIGA) {
      if (!user.fairId) return [];
      return this.searchForFair(searchDto, user.fairId);
    }
    const queryBuilder = this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.collection', 'collection')
      .leftJoinAndSelect('article.articleType', 'articleType');

    if (searchDto.ownReference) {
      queryBuilder.andWhere('article.ownReference ILIKE :ownReference', {
        ownReference: `%${searchDto.ownReference}%`,
      });
    }

    if (searchDto.description) {
      queryBuilder.andWhere('article.description ILIKE :description', {
        description: `%${searchDto.description}%`,
      });
    }

    if (searchDto.collectionId) {
      queryBuilder.andWhere('article.collectionId = :collectionId', {
        collectionId: searchDto.collectionId,
      });
    }

    if (searchDto.articleTypeId) {
      queryBuilder.andWhere('article.articleTypeId = :articleTypeId', {
        articleTypeId: searchDto.articleTypeId,
      });
    }

    if (searchDto.q && searchDto.q.trim()) {
      const q = `%${searchDto.q.trim()}%`;
      queryBuilder.andWhere(
        '(article.ownReference ILIKE :q OR article.description ILIKE :q OR collection.name ILIKE :q OR articleType.name ILIKE :q)',
        { q },
      );
    }

    queryBuilder.orderBy('article.ownReference', 'ASC');

    const results = await queryBuilder.getMany();
    return results.map((a) => this.enrichArticleResponse(a));
  }

  private async searchForFair(
    searchDto: SearchArticleDto,
    fairId: string,
  ): Promise<ArticleWithFairQty[]> {
    const qb = this.fairStockRepository
      .createQueryBuilder('fs')
      .innerJoinAndSelect('fs.article', 'a')
      .leftJoinAndSelect('a.collection', 'collection')
      .leftJoinAndSelect('a.articleType', 'articleType')
      .where('fs.fair_id = :fairId', { fairId });

    if (searchDto.ownReference) {
      qb.andWhere('a.own_reference ILIKE :ownReference', {
        ownReference: `%${searchDto.ownReference}%`,
      });
    }
    if (searchDto.description) {
      qb.andWhere('a.description ILIKE :description', {
        description: `%${searchDto.description}%`,
      });
    }
    if (searchDto.collectionId) {
      qb.andWhere('a.collection_id = :collectionId', {
        collectionId: searchDto.collectionId,
      });
    }
    if (searchDto.articleTypeId) {
      qb.andWhere('a.article_type_id = :articleTypeId', {
        articleTypeId: searchDto.articleTypeId,
      });
    }
    if (searchDto.q && searchDto.q.trim()) {
      const q = `%${searchDto.q.trim()}%`;
      qb.andWhere(
        '(a.own_reference ILIKE :q OR a.description ILIKE :q OR collection.name ILIKE :q OR articleType.name ILIKE :q)',
        { q },
      );
    }
    qb.orderBy('a.own_reference', 'ASC');

    const rows = await qb.getMany();
    return rows.map((fs) => {
      const enriched = this.enrichArticleResponse(fs.article);
      enriched.quantityAtFair = fs.quantity;
      return enriched;
    });
  }

  async updateStock(id: string, quantity: number): Promise<ArticleWithFairQty> {
    const article = await this.articleRepository.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }
    assertHasSizesBlocked(article.hasSizes);

    article.stock = article.stock + quantity;

    if (article.stock < 0) {
      throw new ConflictException('El stock no puede ser negativo');
    }

    await this.articleRepository.save(article);
    return this.findOne(id);
  }

  async getAvailableQuantity(id: string): Promise<{ available: number }> {
    await this.findOne(id);
    const available = await this.salesPointsService.getAvailableStock(id);
    return { available };
  }

  async getStockBreakdown(id: string, user?: User): Promise<StockBreakdown> {
    const article = await this.findOne(id, user);

    if (user && this.isBotigaWithFair(user)) {
      const qty = article.quantityAtFair ?? 0;
      return {
        total: qty,
        bySalesPoint: [
          {
            salesPointId: user.fairId!,
            salesPointCode: 'FIRA',
            salesPointName: 'Fira',
            quantity: qty,
          },
        ],
        byFair: [],
        unassigned: 0,
      };
    }

    const [stockByPoint, stockByFair] = await Promise.all([
      this.salesPointStockRepository.find({
        where: { articleId: id },
        relations: ['salesPoint'],
      }),
      this.fairStockRepository.find({
        where: { articleId: id },
        relations: ['fair'],
      }),
    ]);

    const assignedToPoints = stockByPoint.reduce(
      (sum, sp) => sum + sp.quantity,
      0,
    );
    const assignedToFairs = stockByFair.reduce(
      (sum, fs) => sum + fs.quantity,
      0,
    );
    const bySalesPoint = stockByPoint.map((sp) => ({
      salesPointId: sp.salesPointId,
      salesPointCode: sp.salesPoint?.code ?? '',
      salesPointName: sp.salesPoint?.name ?? sp.salesPoint?.code ?? '-',
      quantity: sp.quantity,
    }));
    const byFair = stockByFair.map((fs) => ({
      fairId: fs.fairId,
      fairName: fs.fair?.name ?? '-',
      quantity: fs.quantity,
    }));

    return {
      total: article.stock,
      bySalesPoint,
      byFair,
      unassigned: Math.max(
        0,
        article.stock - assignedToPoints - assignedToFairs,
      ),
    };
  }

  async addStock(id: string, dto: AddStockDto): Promise<ArticleWithFairQty> {
    const article = await this.articleRepository.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }
    assertHasSizesBlocked(article.hasSizes);

    const qty = dto.quantity;
    const recordedAt = new Date(dto.date);
    const oldPvp = Number(article.pvp);

    await this.stockHistoryRepository.save(
      this.stockHistoryRepository.create({
        articleId: id,
        quantityAdded: qty,
        recordedAt,
      }),
    );

    article.stock += qty;
    article.cost = dto.cost;
    article.pvp = dto.pvp;
    await this.articleRepository.save(article);

    if (shouldRecordPriceHistory(oldPvp, dto.pvp)) {
      await this.priceHistoryRepository.save(
        this.priceHistoryRepository.create({
          articleId: id,
          price: dto.pvp,
          changedAt: recordedAt,
        }),
      );
    }

    const warehouse = await this.salesPointsService.getDefaultWarehouse();
    if (warehouse) {
      const currentAtWarehouse = await this.salesPointsService.getStockAtPoint(
        warehouse.id,
        id,
      );
      await this.salesPointsService.assignStock(warehouse.id, {
        articleId: id,
        quantity: currentAtWarehouse + qty,
      });
    }

    return this.findOne(id);
  }

  async getPriceHistory(
    id: string,
    user?: User,
  ): Promise<ArticlePriceHistory[]> {
    await this.findOne(id, user);
    return this.priceHistoryRepository.find({
      where: { articleId: id },
      order: { changedAt: 'ASC' },
    });
  }

  async getStockHistory(
    id: string,
    year?: number,
    user?: User,
  ): Promise<ArticleStockHistory[]> {
    await this.findOne(id, user);
    const qb = this.stockHistoryRepository
      .createQueryBuilder('h')
      .where('h.article_id = :id', { id });

    if (year) {
      qb.andWhere('h.recorded_at >= :start AND h.recorded_at <= :end', {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
      });
    }

    return qb.orderBy('h.recorded_at', 'ASC').getMany();
  }
}
