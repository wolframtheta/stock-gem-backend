import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './entities/article.entity';
import { ArticlePriceHistory } from './entities/article-price-history.entity';
import { ArticleStockHistory } from './entities/article-stock-history.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { SearchArticleDto } from './dto/search-article.dto';
import { AddStockDto } from './dto/add-stock.dto';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { SalesPointStock } from '../sales-points/entities/sales-point-stock.entity';
import { FairStock } from '../fairs/entities/fair-stock.entity';
import { Collection } from '../config/entities/collection.entity';
import { ArticleType } from '../config/entities/article-type.entity';
import { SalesPointsService } from '../sales-points/sales-points.service';
import { User, UserRole } from '../auth/entities/user.entity';

export type ArticleWithFairQty = Article & { quantityAtFair?: number };

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
    @InjectRepository(ArticlePriceHistory)
    private priceHistoryRepository: Repository<ArticlePriceHistory>,
    @InjectRepository(ArticleStockHistory)
    private stockHistoryRepository: Repository<ArticleStockHistory>,
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
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

  async create(createArticleDto: CreateArticleDto): Promise<Article> {
    // Verificar si la referencia propia ya existe
    const existingArticle = await this.articleRepository.findOne({
      where: { ownReference: createArticleDto.ownReference },
    });

    if (existingArticle) {
      throw new ConflictException(
        'El artículo con esta referencia propia ya existe',
      );
    }

    // Verificar si el proveedor existe (si se proporciona)
    let supplier: Supplier | null = null;
    if (createArticleDto.supplierId) {
      supplier = await this.supplierRepository.findOne({
        where: { id: createArticleDto.supplierId },
      });

      if (!supplier) {
        throw new NotFoundException(
          `Supplier with ID ${createArticleDto.supplierId} not found`,
        );
      }
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
          `Tipus d'article amb ID ${createArticleDto.articleTypeId} no trobat`,
        );
      }
    }

    const article = this.articleRepository.create({
      ...createArticleDto,
      stock: createArticleDto.stock ?? 0,
      supplier: supplier || null,
      collection: collection || null,
      articleType: articleType || null,
    });

    const saved = await this.articleRepository.save(article);

    if (saved.pvp > 0) {
      await this.priceHistoryRepository.save(
        this.priceHistoryRepository.create({
          articleId: saved.id,
          price: saved.pvp,
          changedAt: new Date(),
        }),
      );
    }

    if (saved.stock > 0) {
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

    return saved;
  }

  private isBotigaWithFair(user: User): boolean {
    return user.role === UserRole.BOTIGA && !!user.fairId;
  }

  async findAll(user: User): Promise<ArticleWithFairQty[]> {
    if (user.role === UserRole.BOTIGA) {
      if (!user.fairId) return [];
      return this.findAllForFair(user.fairId);
    }
    return this.articleRepository.find({
      relations: ['supplier', 'collection', 'articleType'],
      order: { ownReference: 'ASC' },
    });
  }

  private async findAllForFair(fairId: string): Promise<ArticleWithFairQty[]> {
    const stockRows = await this.fairStockRepository
      .createQueryBuilder('fs')
      .innerJoinAndSelect('fs.article', 'a')
      .leftJoinAndSelect('a.supplier', 'supplier')
      .leftJoinAndSelect('a.collection', 'collection')
      .leftJoinAndSelect('a.articleType', 'articleType')
      .where('fs.fair_id = :fairId', { fairId })
      .orderBy('a.own_reference', 'ASC')
      .getMany();
    return stockRows.map((fs) => ({
      ...fs.article,
      quantityAtFair: fs.quantity,
    }));
  }

  async findOne(id: string, user?: User): Promise<ArticleWithFairQty> {
    if (user?.role === UserRole.BOTIGA) {
      if (!user.fairId) throw new NotFoundException(`Article with ID ${id} not found`);
      return this.findOneForFair(id, user.fairId);
    }
    const article = await this.articleRepository.findOne({
      where: { id },
      relations: ['supplier', 'collection', 'articleType'],
    });
    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }
    return article;
  }

  private async findOneForFair(
    id: string,
    fairId: string,
  ): Promise<ArticleWithFairQty> {
    const fairStock = await this.fairStockRepository.findOne({
      where: { fairId, articleId: id },
      relations: ['article', 'article.supplier', 'article.collection', 'article.articleType'],
    });
    if (!fairStock) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }
    return {
      ...fairStock.article,
      quantityAtFair: fairStock.quantity,
    };
  }

  async update(id: string, updateArticleDto: UpdateArticleDto): Promise<Article> {
    const article = await this.findOne(id);

    // Si se actualiza la referencia propia, verificar que no exista otra
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

    // Si se actualiza el proveedor, verificar que existe
    if (updateArticleDto.supplierId) {
      const supplier = await this.supplierRepository.findOne({
        where: { id: updateArticleDto.supplierId },
      });

      if (!supplier) {
        throw new NotFoundException(
          `Supplier with ID ${updateArticleDto.supplierId} not found`,
        );
      }

      article.supplier = supplier;
      article.supplierId = supplier.id;
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
        if (!t) throw new NotFoundException('Tipus d\'article no trobat');
        article.articleType = t;
        article.articleTypeId = t.id;
      }
    }

    const oldPvp = article.pvp;
    const oldStock = article.stock;
    Object.assign(article, {
      ...updateArticleDto,
      supplierId: undefined,
      collectionId: undefined,
      articleTypeId: undefined,
    });

    const saved = await this.articleRepository.save(article);

    if (
      updateArticleDto.pvp !== undefined &&
      Number(updateArticleDto.pvp) !== Number(oldPvp)
    ) {
      await this.priceHistoryRepository.save(
        this.priceHistoryRepository.create({
          articleId: saved.id,
          price: saved.pvp,
          changedAt: new Date(),
        }),
      );
    }

    if (updateArticleDto.stock !== undefined) {
      const warehouse = await this.salesPointsService.getDefaultWarehouse();
      if (warehouse) {
        const currentAtWarehouse =
          await this.salesPointsService.getStockAtPoint(warehouse.id, saved.id);
        const newTotal = Number(saved.stock);
        const assignedElsewhere =
          (await this.getAssignedOutsideWarehouse(saved.id, warehouse.id)) ?? 0;
        const newWarehouseQty = Math.max(
          0,
          newTotal - assignedElsewhere,
        );
        await this.salesPointsService.assignStock(warehouse.id, {
          articleId: saved.id,
          quantity: newWarehouseQty,
        });
      }
    }

    return saved;
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
    const article = await this.findOne(id);
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
      .leftJoinAndSelect('article.supplier', 'supplier')
      .leftJoinAndSelect('article.collection', 'collection')
      .leftJoinAndSelect('article.articleType', 'articleType');

    if (searchDto.ownReference) {
      queryBuilder.andWhere('article.ownReference ILIKE :ownReference', {
        ownReference: `%${searchDto.ownReference}%`,
      });
    }

    if (searchDto.supplierReference) {
      queryBuilder.andWhere(
        'article.supplierReference ILIKE :supplierReference',
        {
          supplierReference: `%${searchDto.supplierReference}%`,
        },
      );
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
        '(article.ownReference ILIKE :q OR article.description ILIKE :q OR article.supplierReference ILIKE :q OR collection.name ILIKE :q OR articleType.name ILIKE :q)',
        { q },
      );
    }

    queryBuilder.orderBy('article.ownReference', 'ASC');

    return queryBuilder.getMany();
  }

  private async searchForFair(
    searchDto: SearchArticleDto,
    fairId: string,
  ): Promise<ArticleWithFairQty[]> {
    const qb = this.fairStockRepository
      .createQueryBuilder('fs')
      .innerJoinAndSelect('fs.article', 'a')
      .leftJoinAndSelect('a.supplier', 'supplier')
      .leftJoinAndSelect('a.collection', 'collection')
      .leftJoinAndSelect('a.articleType', 'articleType')
      .where('fs.fair_id = :fairId', { fairId });

    if (searchDto.ownReference) {
      qb.andWhere('a.own_reference ILIKE :ownReference', {
        ownReference: `%${searchDto.ownReference}%`,
      });
    }
    if (searchDto.supplierReference) {
      qb.andWhere('a.supplier_reference ILIKE :supplierReference', {
        supplierReference: `%${searchDto.supplierReference}%`,
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
        '(a.own_reference ILIKE :q OR a.description ILIKE :q OR a.supplier_reference ILIKE :q OR collection.name ILIKE :q OR articleType.name ILIKE :q)',
        { q },
      );
    }
    qb.orderBy('a.own_reference', 'ASC');

    const rows = await qb.getMany();
    return rows.map((fs) => ({
      ...fs.article,
      quantityAtFair: fs.quantity,
    }));
  }

  async updateStock(id: string, quantity: number): Promise<Article> {
    const article = await this.findOne(id);
    article.stock = article.stock + quantity;

    if (article.stock < 0) {
      throw new ConflictException('El stock no puede ser negativo');
    }

    return this.articleRepository.save(article);
  }

  async getAvailableQuantity(id: string): Promise<{ available: number }> {
    await this.findOne(id);
    const available = await this.salesPointsService.getAvailableStock(id);
    return { available };
  }

  async getStockBreakdown(id: string, user?: User): Promise<StockBreakdown> {
    const article = await this.findOne(id, user);

    if (user && this.isBotigaWithFair(user)) {
      const qty = (article as ArticleWithFairQty).quantityAtFair ?? 0;
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

    const assignedToPoints = stockByPoint.reduce((sum, sp) => sum + sp.quantity, 0);
    const assignedToFairs = stockByFair.reduce((sum, fs) => sum + fs.quantity, 0);
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
      unassigned: Math.max(0, article.stock - assignedToPoints - assignedToFairs),
    };
  }

  async addStock(id: string, dto: AddStockDto): Promise<Article> {
    const article = await this.findOne(id);
    const qty = dto.quantity;
    const recordedAt = new Date(dto.date);

    await this.stockHistoryRepository.save(
      this.stockHistoryRepository.create({
        articleId: id,
        quantityAdded: qty,
        recordedAt,
      }),
    );

    article.stock += qty;
    await this.articleRepository.save(article);

    const warehouse = await this.salesPointsService.getDefaultWarehouse();
    if (warehouse) {
      const currentAtWarehouse =
        await this.salesPointsService.getStockAtPoint(warehouse.id, id);
      await this.salesPointsService.assignStock(warehouse.id, {
        articleId: id,
        quantity: currentAtWarehouse + qty,
      });
    }

    return this.findOne(id);
  }

  async getPriceHistory(id: string, user?: User): Promise<ArticlePriceHistory[]> {
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
      qb.andWhere(
        'h.recorded_at >= :start AND h.recorded_at <= :end',
        {
          start: `${year}-01-01`,
          end: `${year}-12-31`,
        },
      );
    }

    return qb.orderBy('h.recorded_at', 'ASC').getMany();
  }
}

