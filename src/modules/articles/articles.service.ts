import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Article } from './entities/article.entity';
import { ArticlePhoto } from './entities/article-photo.entity';
import { ArticleVariant } from './entities/article-variant.entity';
import { ArticleVariantStock } from './entities/article-variant-stock.entity';
import { ArticlePriceHistory } from './entities/article-price-history.entity';
import { ArticleStockHistory } from './entities/article-stock-history.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { SearchArticleDto } from './dto/search-article.dto';
import { AddStockDto } from './dto/add-stock.dto';
import { ArticleVariantInputDto } from './dto/article-variant-input.dto';
import { shouldRecordPriceHistory } from './articles-pricing.util';
import {
  assertCanDeleteVariant,
  assertHasVariantsBlocked,
  assertStockWritable,
  DEFAULT_MIGRATION_VARIANT_LABEL,
  normalizeVariantLabel,
  sumWarehouseQuantities,
  validateAddStockVariants,
  validateUniqueVariantLabels,
} from './articles-variants.util';
import { SalesPointStock } from '../sales-points/entities/sales-point-stock.entity';
import { SalesPointVariantStock } from '../sales-points/entities/sales-point-variant-stock.entity';
import { FairStock } from '../fairs/entities/fair-stock.entity';
import { FairVariantStock } from '../fairs/entities/fair-variant-stock.entity';
import { Collection } from '../config/entities/collection.entity';
import { ArticleType } from '../config/entities/article-type.entity';
import { SalesPointsService } from '../sales-points/sales-points.service';
import { User, UserRole } from '../auth/entities/user.entity';

export type ArticleVariantResponse = {
  id: string;
  label: string;
  sortOrder: number;
  warehouseQuantity: number;
};

export type ArticleWithFairQty = Omit<Article, 'variants'> & {
  quantityAtFair?: number;
  variants?: ArticleVariantResponse[];
};

export interface StockBreakdownSalesPointColumn {
  salesPointId: string;
  salesPointCode: string;
  salesPointName: string;
}

export interface StockBreakdownVariantRow {
  articleVariantId: string;
  label: string;
  sortOrder: number;
  quantitiesBySalesPointId: Record<string, number>;
  total: number;
}

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
  /** Matriu talla × punt de venda (només articles amb hasVariants). */
  variantMatrix?: {
    columns: StockBreakdownSalesPointColumn[];
    rows: StockBreakdownVariantRow[];
  };
}

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    @InjectRepository(ArticlePhoto)
    private articlePhotoRepository: Repository<ArticlePhoto>,
    @InjectRepository(ArticleVariant)
    private articleVariantRepository: Repository<ArticleVariant>,
    @InjectRepository(ArticleVariantStock)
    private articleVariantStockRepository: Repository<ArticleVariantStock>,
    @InjectRepository(ArticlePriceHistory)
    private priceHistoryRepository: Repository<ArticlePriceHistory>,
    @InjectRepository(ArticleStockHistory)
    private stockHistoryRepository: Repository<ArticleStockHistory>,
    @InjectRepository(SalesPointStock)
    private salesPointStockRepository: Repository<SalesPointStock>,
    @InjectRepository(SalesPointVariantStock)
    private salesPointVariantStockRepository: Repository<SalesPointVariantStock>,
    @InjectRepository(FairStock)
    private fairStockRepository: Repository<FairStock>,
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>,
    @InjectRepository(ArticleType)
    private articleTypeRepository: Repository<ArticleType>,
    private salesPointsService: SalesPointsService,
  ) {}

  async create(createArticleDto: CreateArticleDto): Promise<ArticleWithFairQty> {
    const hasVariants = createArticleDto.hasVariants ?? false;
    assertStockWritable(hasVariants, createArticleDto.stock);

    if (hasVariants && !createArticleDto.variants?.length) {
      throw new BadRequestException(
        'Article amb variants requereix almenys una talla',
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

    const { photoPaths, photo, variants, hasVariants: _hv, ...articleData } =
      createArticleDto;
    const primaryPhoto = photoPaths?.[0] ?? photo ?? null;

    const article = this.articleRepository.create({
      ...articleData,
      cost: createArticleDto.cost ?? null,
      stock: hasVariants ? 0 : (createArticleDto.stock ?? 0),
      hasVariants,
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

    if (hasVariants) {
      await this.syncArticleVariants(saved.id, variants!);
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
      relations: ['collection', 'articleType', 'photos', 'variants', 'variants.variantStock'],
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
        'variants',
        'variants.variantStock',
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
    if (!article.hasVariants) {
      result.variants = [];
      return result;
    }
    result.variants = (article.variants ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => ({
        id: s.id,
        label: s.label,
        sortOrder: s.sortOrder,
        warehouseQuantity: s.variantStock?.quantity ?? 0,
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

  private async getTotalQtyForVariant(
    articleVariantId: string,
    em: EntityManager,
  ): Promise<number> {
    const stockRepo = em.getRepository(ArticleVariantStock);
    const spVariantRepo = em.getRepository(SalesPointVariantStock);
    const fairVariantRepo = em.getRepository(FairVariantStock);

    const warehouse = await stockRepo.findOne({ where: { articleVariantId } });
    const spResult = await spVariantRepo
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.quantity), 0)', 'total')
      .where('s.article_variant_id = :articleVariantId', { articleVariantId })
      .getRawOne();
    const fairResult = await fairVariantRepo
      .createQueryBuilder('f')
      .select('COALESCE(SUM(f.quantity), 0)', 'total')
      .where('f.article_variant_id = :articleVariantId', { articleVariantId })
      .getRawOne();

    return (
      Number(warehouse?.quantity ?? 0) +
      Number(spResult?.total ?? 0) +
      Number(fairResult?.total ?? 0)
    );
  }

  private async assertCanActivateHasVariants(articleId: string): Promise<void> {
    const breakdown = await this.getStockBreakdown(articleId);
    if (breakdown.unassigned > 0) {
      throw new ConflictException(
        'No es pot activar variants: hi ha stock no assignat. Assigna tot al magatzem abans.',
      );
    }
    if (breakdown.byFair.some((f) => f.quantity > 0)) {
      throw new ConflictException(
        'No es pot activar variants amb stock assignat a fires',
      );
    }
    const warehouse = await this.salesPointsService.getDefaultWarehouse();
    if (warehouse) {
      const outside = breakdown.bySalesPoint
        .filter((sp) => sp.salesPointId !== warehouse.id)
        .reduce((sum, sp) => sum + sp.quantity, 0);
      if (outside > 0) {
        throw new ConflictException(
          'No es pot activar variants amb stock assignat a punts de venda',
        );
      }
      const warehouseQty =
        breakdown.bySalesPoint.find(
          (sp) => sp.salesPointId === warehouse.id,
        )?.quantity ?? 0;
      if (warehouseQty < breakdown.total) {
        throw new ConflictException(
          "No es pot activar variants: tot el stock ha d'estar al magatzem",
        );
      }
    }
  }

  private async assertCanDeactivateHasVariants(articleId: string): Promise<void> {
    const sizes = await this.articleVariantRepository.find({
      where: { articleId },
    });
    for (const size of sizes) {
      const total = await this.getTotalQtyForVariant(
        size.id,
        this.articleRepository.manager,
      );
      if (total > 0) {
        throw new ConflictException(
          'No es pot desactivar variants mentre hi hagi stock per variant',
        );
      }
    }
  }

  /**
   * RN-51: per articles amb variants, el magatzem SP ha de coincidir amb la suma de
   * article_variant_stock. Sincronització directa (no assignStock: evita validació
   * d'unassigned fora de la transacció i lectura stale de article.stock).
   */
  private async syncWarehouseStockForVariants(
    em: EntityManager,
    articleId: string,
    total: number,
  ): Promise<void> {
    const warehouse = await this.salesPointsService.getDefaultWarehouse();
    if (!warehouse) {
      return;
    }

    const spStockRepo = em.getRepository(SalesPointStock);
    const existing = await spStockRepo.findOne({
      where: { salesPointId: warehouse.id, articleId },
    });

    if (total === 0) {
      if (existing) {
        await spStockRepo.remove(existing);
      }
      return;
    }

    if (existing) {
      existing.quantity = total;
      await spStockRepo.save(existing);
      return;
    }

    await spStockRepo.save(
      spStockRepo.create({
        salesPointId: warehouse.id,
        articleId,
        quantity: total,
      }),
    );
  }

  private async syncArticleVariants(
    articleId: string,
    variantsInput: ArticleVariantInputDto[],
  ): Promise<number> {
    return this.articleRepository.manager.transaction(async (em) => {
      await em.findOne(Article, {
        where: { id: articleId },
        lock: { mode: 'pessimistic_write' },
      });

      const variantRepo = em.getRepository(ArticleVariant);
      const stockRepo = em.getRepository(ArticleVariantStock);
      const spVariantRepo = em.getRepository(SalesPointVariantStock);
      const fairVariantRepo = em.getRepository(FairVariantStock);

      const normalized = variantsInput.map((s, index) => ({
        id: s.id,
        label: normalizeVariantLabel(s.label),
        warehouseQuantity: Math.max(0, Number(s.warehouseQuantity ?? 0)),
        sortOrder: s.sortOrder ?? index,
      }));

      validateUniqueVariantLabels(normalized.map((s) => s.label));

      const existing = await variantRepo.find({
        where: { articleId },
        relations: ['variantStock'],
      });
      const existingById = new Map(existing.map((s) => [s.id, s]));

      for (const input of normalized) {
        if (input.id && !existingById.has(input.id)) {
          throw new BadRequestException("Variant no pertany a l'article");
        }
      }

      const keptIds = new Set<string>();

      for (const input of normalized) {
        let size: ArticleVariant;
        if (input.id) {
          size = existingById.get(input.id)!;
          size.label = input.label;
          size.sortOrder = input.sortOrder;
          size = await variantRepo.save(size);
        } else {
          size = variantRepo.create({
            articleId,
            label: input.label,
            sortOrder: input.sortOrder,
          });
          size = await variantRepo.save(size);
        }
        keptIds.add(size.id);

        let variantStock = await stockRepo.findOne({
          where: { articleVariantId: size.id },
        });
        if (!variantStock) {
          variantStock = stockRepo.create({
            articleVariantId: size.id,
            quantity: input.warehouseQuantity,
          });
        } else {
          variantStock.quantity = input.warehouseQuantity;
        }
        await stockRepo.save(variantStock);
      }

      for (const old of existing) {
        if (keptIds.has(old.id)) continue;
        const totalQty = await this.getTotalQtyForVariant(old.id, em);
        assertCanDeleteVariant(totalQty);
        await stockRepo.delete({ articleVariantId: old.id });
        await spVariantRepo.delete({ articleVariantId: old.id });
        await fairVariantRepo.delete({ articleVariantId: old.id });
        await variantRepo.delete({ id: old.id });
      }

      const total = sumWarehouseQuantities(
        normalized.map((s) => ({ warehouseQuantity: s.warehouseQuantity })),
      );

      await em.update(
        Article,
        { id: articleId },
        { stock: total, hasVariants: true },
      );

      await this.syncWarehouseStockForVariants(em, articleId, total);

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

    const newHasVariants =
      updateArticleDto.hasVariants !== undefined
        ? updateArticleDto.hasVariants
        : article.hasVariants;

    assertStockWritable(newHasVariants, updateArticleDto.stock);

    const turningOn = !article.hasVariants && newHasVariants === true;
    const turningOff = article.hasVariants && newHasVariants === false;

    if (turningOn) {
      await this.assertCanActivateHasVariants(id);
    }
    if (turningOff) {
      await this.assertCanDeactivateHasVariants(id);
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
    const { photoPaths, photo, variants, hasVariants, stock, ...updateData } =
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
      article.hasVariants = false;
      await this.articleVariantRepository.delete({ articleId: id });
    } else if (turningOn) {
      article.hasVariants = true;
      let variantsInput = variants;
      if (!variantsInput?.length && article.stock > 0) {
        variantsInput = [
          {
            label: DEFAULT_MIGRATION_VARIANT_LABEL,
            warehouseQuantity: article.stock,
          },
        ];
      } else if (!variantsInput?.length) {
        throw new BadRequestException(
          'Article amb variants requereix almenys una talla',
        );
      }
      article.stock = await this.syncArticleVariants(id, variantsInput);
    } else if (article.hasVariants && variants !== undefined) {
      article.stock = await this.syncArticleVariants(id, variants);
    } else if (!article.hasVariants && stock !== undefined) {
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
    assertHasVariantsBlocked(article.hasVariants);

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

  private async buildVariantStockMatrix(
    articleId: string,
    stockByPoint: SalesPointStock[],
  ): Promise<StockBreakdown['variantMatrix'] | undefined> {
    const article = await this.articleRepository.findOne({
      where: { id: articleId },
      select: ['id', 'hasVariants'],
    });
    if (!article?.hasVariants) {
      return undefined;
    }

    const sizes = await this.articleVariantRepository.find({
      where: { articleId },
      relations: ['variantStock'],
      order: { sortOrder: 'ASC', label: 'ASC' },
    });
    if (sizes.length === 0) {
      return undefined;
    }

    const warehouse = await this.salesPointsService.getDefaultWarehouse();
    const variantIds = sizes.map((s) => s.id);
    const spVariantRows = await this.salesPointVariantStockRepository.find({
      where: { articleVariantId: In(variantIds) },
      relations: ['salesPoint'],
    });

    const columnMap = new Map<string, StockBreakdownSalesPointColumn>();

    if (warehouse) {
      columnMap.set(warehouse.id, {
        salesPointId: warehouse.id,
        salesPointCode: warehouse.code,
        salesPointName: warehouse.name,
      });
    }

    for (const sp of stockByPoint) {
      if (warehouse && sp.salesPointId === warehouse.id) {
        continue;
      }
      if (sp.quantity <= 0) {
        continue;
      }
      columnMap.set(sp.salesPointId, {
        salesPointId: sp.salesPointId,
        salesPointCode: sp.salesPoint?.code ?? '',
        salesPointName: sp.salesPoint?.name ?? sp.salesPoint?.code ?? '-',
      });
    }

    for (const row of spVariantRows) {
      if (row.quantity <= 0) {
        continue;
      }
      columnMap.set(row.salesPointId, {
        salesPointId: row.salesPointId,
        salesPointCode: row.salesPoint?.code ?? '',
        salesPointName: row.salesPoint?.name ?? row.salesPoint?.code ?? '-',
      });
    }

    const columns = Array.from(columnMap.values()).sort((a, b) => {
      if (warehouse) {
        if (a.salesPointId === warehouse.id) return -1;
        if (b.salesPointId === warehouse.id) return 1;
      }
      return a.salesPointName.localeCompare(b.salesPointName, 'ca');
    });

    const spQtyByVariant = new Map<string, Map<string, number>>();
    for (const row of spVariantRows) {
      if (!spQtyByVariant.has(row.articleVariantId)) {
        spQtyByVariant.set(row.articleVariantId, new Map());
      }
      spQtyByVariant.get(row.articleVariantId)!.set(row.salesPointId, row.quantity);
    }

    const matrixRows: StockBreakdownVariantRow[] = sizes.map((size) => {
      const quantitiesBySalesPointId: Record<string, number> = {};
      let total = 0;
      for (const col of columns) {
        const qty =
          warehouse && col.salesPointId === warehouse.id
            ? (size.variantStock?.quantity ?? 0)
            : (spQtyByVariant.get(size.id)?.get(col.salesPointId) ?? 0);
        quantitiesBySalesPointId[col.salesPointId] = qty;
        total += qty;
      }
      return {
        articleVariantId: size.id,
        label: size.label,
        sortOrder: size.sortOrder,
        quantitiesBySalesPointId,
        total,
      };
    });

    return { columns, rows: matrixRows };
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

    const variantMatrix = await this.buildVariantStockMatrix(id, stockByPoint);

    return {
      total: article.stock,
      bySalesPoint,
      byFair,
      unassigned: Math.max(
        0,
        article.stock - assignedToPoints - assignedToFairs,
      ),
      variantMatrix,
    };
  }

  async addStock(id: string, dto: AddStockDto): Promise<ArticleWithFairQty> {
    const article = await this.articleRepository.findOne({
      where: { id },
      relations: ['variants', 'variants.variantStock'],
    });
    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    if (article.hasVariants) {
      return this.addStockForVariants(article, dto);
    }

    if (dto.quantity == null || dto.quantity < 1) {
      throw new BadRequestException('La quantitat ha de ser almenys 1');
    }

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

  private async addStockForVariants(
    article: Article,
    dto: AddStockDto,
  ): Promise<ArticleWithFairQty> {
    if (!dto.variants?.length) {
      throw new BadRequestException('Indica les quantitats per variant');
    }

    const variantIds = new Set((article.variants ?? []).map((s) => s.id));
    const totalAdded = validateAddStockVariants(dto.variants, variantIds);
    const recordedAt = new Date(dto.date);
    const oldPvp = Number(article.pvp);
    const addByVariantId = new Map(
      dto.variants.map((s) => [s.articleVariantId, s.quantity]),
    );

    await this.articleRepository.manager.transaction(async (em) => {
      const stockRepo = em.getRepository(ArticleVariantStock);
      const sizes = await em.find(ArticleVariant, {
        where: { articleId: article.id },
        relations: ['variantStock'],
      });

      let newTotal = 0;
      for (const size of sizes) {
        const delta = addByVariantId.get(size.id) ?? 0;
        let variantStock = size.variantStock;
        if (!variantStock) {
          variantStock = stockRepo.create({
            articleVariantId: size.id,
            quantity: delta,
          });
        } else {
          variantStock.quantity += delta;
        }
        await stockRepo.save(variantStock);
        newTotal += variantStock.quantity;
      }

      await em.update(
        Article,
        { id: article.id },
        { stock: newTotal, cost: dto.cost, pvp: dto.pvp },
      );

      await em.save(
        em.create(ArticleStockHistory, {
          articleId: article.id,
          quantityAdded: totalAdded,
          recordedAt,
        }),
      );

      await this.syncWarehouseStockForVariants(em, article.id, newTotal);
    });

    if (shouldRecordPriceHistory(oldPvp, dto.pvp)) {
      await this.priceHistoryRepository.save(
        this.priceHistoryRepository.create({
          articleId: article.id,
          price: dto.pvp,
          changedAt: recordedAt,
        }),
      );
    }

    return this.findOne(article.id);
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
