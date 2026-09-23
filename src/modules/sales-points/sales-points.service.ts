import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalesPoint } from './entities/sales-point.entity';
import { SalesPointStock } from './entities/sales-point-stock.entity';
import { Article } from '../articles/entities/article.entity';
import { FairStock } from '../fairs/entities/fair-stock.entity';
import { CreateSalesPointDto } from './dto/create-sales-point.dto';
import { UpdateSalesPointDto } from './dto/update-sales-point.dto';
import { AssignStockDto, AssignStockBatchDto } from './dto/assign-stock.dto';
import { FairsService } from '../fairs/fairs.service';
import { ArticleVariant } from '../articles/entities/article-variant.entity';
import { ArticleVariantStock } from '../articles/entities/article-variant-stock.entity';
import { SalesPointVariantStock } from './entities/sales-point-variant-stock.entity';
import { MoveStockItemDto } from './dto/move-stock.dto';
import {
  assertMoveItemShape,
  MoveStockVariantLine,
  normalizeMoveVariantLines,
} from './stock-move-variants.util';

export interface StockVariantLineView {
  articleVariantId: string;
  label: string;
  sortOrder: number;
  quantity: number;
  maxQuantity: number;
}

export type SalesPointStockEnriched = SalesPointStock & {
  maxQuantity: number;
  variants?: StockVariantLineView[];
};

@Injectable()
export class SalesPointsService {
  constructor(
    @InjectRepository(SalesPoint)
    private salesPointRepository: Repository<SalesPoint>,
    @InjectRepository(SalesPointStock)
    private stockRepository: Repository<SalesPointStock>,
    @InjectRepository(SalesPointVariantStock)
    private salesPointVariantStockRepository: Repository<SalesPointVariantStock>,
    @InjectRepository(ArticleVariant)
    private articleVariantRepository: Repository<ArticleVariant>,
    @InjectRepository(ArticleVariantStock)
    private articleVariantStockRepository: Repository<ArticleVariantStock>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    @InjectRepository(FairStock)
    private fairStockRepository: Repository<FairStock>,
    @Inject(forwardRef(() => FairsService))
    private fairsService: FairsService,
  ) {}

  async create(createDto: CreateSalesPointDto): Promise<SalesPoint> {
    const existing = await this.salesPointRepository.findOne({
      where: { code: createDto.code },
    });
    if (existing) {
      throw new BadRequestException(
        `Ya existe un punto de venta con código ${createDto.code}`,
      );
    }
    if (createDto.isDefaultWarehouse) {
      await this.unsetDefaultWarehouse();
    }
    const salesPoint = this.salesPointRepository.create(createDto);
    return this.salesPointRepository.save(salesPoint);
  }

  async findAll(): Promise<SalesPoint[]> {
    return this.salesPointRepository.find({
      order: { code: 'ASC' },
    });
  }

  async findOne(id: string): Promise<SalesPoint> {
    const salesPoint = await this.salesPointRepository.findOne({
      where: { id },
      relations: ['stock', 'stock.article'],
    });
    if (!salesPoint) {
      throw new NotFoundException(`Punto de venta con ID ${id} no encontrado`);
    }
    return salesPoint;
  }

  async update(
    id: string,
    updateDto: UpdateSalesPointDto,
  ): Promise<SalesPoint> {
    const salesPoint = await this.findOne(id);
    if (updateDto.code && updateDto.code !== salesPoint.code) {
      const existing = await this.salesPointRepository.findOne({
        where: { code: updateDto.code },
      });
      if (existing) {
        throw new BadRequestException(
          `Ya existe un punto de venta con código ${updateDto.code}`,
        );
      }
    }
    if (updateDto.isDefaultWarehouse === true) {
      await this.unsetDefaultWarehouse(id);
    }
    Object.assign(salesPoint, updateDto);
    return this.salesPointRepository.save(salesPoint);
  }

  async getDefaultWarehouse(): Promise<SalesPoint | null> {
    return this.salesPointRepository.findOne({
      where: { isDefaultWarehouse: true },
    });
  }

  private async unsetDefaultWarehouse(excludeId?: string): Promise<void> {
    const qb = this.salesPointRepository
      .createQueryBuilder()
      .update(SalesPoint)
      .set({ isDefaultWarehouse: false })
      .where('is_default_warehouse = :flag', { flag: true });
    if (excludeId) {
      qb.andWhere('id != :id', { id: excludeId });
    }
    await qb.execute();
  }

  async remove(id: string): Promise<void> {
    const salesPoint = await this.findOne(id);
    await this.salesPointRepository.remove(salesPoint);
  }

  async getStock(salesPointId: string): Promise<SalesPointStock[]> {
    await this.findOne(salesPointId);
    return this.stockRepository.find({
      where: { salesPointId },
      relations: ['article'],
      order: { articleId: 'ASC' },
    });
  }

  async getStockWithLimits(
    salesPointId: string,
  ): Promise<SalesPointStockEnriched[]> {
    const items = await this.getStock(salesPointId);
    const warehouse = await this.getDefaultWarehouse();
    const isWarehouse = warehouse ? salesPointId === warehouse.id : false;
    const result: SalesPointStockEnriched[] = [];

    for (const item of items) {
      let maxQuantity: number;
      if (!warehouse) {
        maxQuantity = item.quantity;
      } else if (isWarehouse) {
        const unassigned = await this.getUnassignedStock(item.articleId);
        maxQuantity = item.quantity + unassigned;
      } else {
        const warehouseStock = await this.getStockAtPoint(
          warehouse.id,
          item.articleId,
        );
        maxQuantity = item.quantity + warehouseStock;
      }

      const enriched: SalesPointStockEnriched = { ...item, maxQuantity };
      if (item.article?.hasVariants) {
        enriched.variants = await this.buildVariantLinesForSalesPoint(
          item.articleId,
          salesPointId,
          warehouse?.id ?? null,
        );
      }
      result.push(enriched);
    }
    return result;
  }

  async buildVariantLinesForSalesPoint(
    articleId: string,
    salesPointId: string,
    warehouseId: string | null,
  ): Promise<StockVariantLineView[]> {
    const variants = await this.articleVariantRepository.find({
      where: { articleId },
      order: { sortOrder: 'ASC', label: 'ASC' },
    });
    const isWarehouse = warehouseId !== null && salesPointId === warehouseId;
    const lines: StockVariantLineView[] = [];

    for (const variant of variants) {
      const quantity = await this.getVariantQuantityAtPoint(
        salesPointId,
        variant.id,
        warehouseId,
      );
      if (quantity <= 0 && !isWarehouse) {
        continue;
      }
      lines.push({
        articleVariantId: variant.id,
        label: variant.label,
        sortOrder: variant.sortOrder,
        quantity,
        maxQuantity: quantity,
      });
    }
    return lines;
  }

  async getVariantQuantityAtPoint(
    salesPointId: string,
    articleVariantId: string,
    warehouseId: string | null,
  ): Promise<number> {
    if (warehouseId && salesPointId === warehouseId) {
      const row = await this.articleVariantStockRepository.findOne({
        where: { articleVariantId },
      });
      return row?.quantity ?? 0;
    }
    const row = await this.salesPointVariantStockRepository.findOne({
      where: { salesPointId, articleVariantId },
    });
    return row?.quantity ?? 0;
  }

  private async getVariantIdsForArticle(articleId: string): Promise<Set<string>> {
    const rows = await this.articleVariantRepository.find({
      where: { articleId },
      select: ['id'],
    });
    return new Set(rows.map((r) => r.id));
  }

  private async syncSalesPointAggregate(
    salesPointId: string,
    articleId: string,
  ): Promise<void> {
    const variants = await this.articleVariantRepository.find({
      where: { articleId },
      select: ['id'],
    });
    let total = 0;
    const warehouse = await this.getDefaultWarehouse();
    for (const v of variants) {
      total += await this.getVariantQuantityAtPoint(
        salesPointId,
        v.id,
        warehouse?.id ?? null,
      );
    }
    const existing = await this.stockRepository.findOne({
      where: { salesPointId, articleId },
    });
    if (total <= 0) {
      if (existing) {
        await this.stockRepository.remove(existing);
      }
      return;
    }
    if (existing) {
      existing.quantity = total;
      await this.stockRepository.save(existing);
    } else {
      await this.stockRepository.save(
        this.stockRepository.create({ salesPointId, articleId, quantity: total }),
      );
    }
  }

  async restoreWarehouseVariantFromFair(
    articleVariantId: string,
    quantity: number,
    articleId: string,
  ): Promise<void> {
    await this.restoreWarehouseVariant(articleVariantId, quantity, articleId);
  }

  async reduceWarehouseVariantForFair(
    articleVariantId: string,
    quantity: number,
    articleId: string,
  ): Promise<void> {
    await this.reduceWarehouseVariant(articleVariantId, quantity, articleId);
  }

  private async reduceWarehouseVariant(
    articleVariantId: string,
    quantity: number,
    articleId: string,
  ): Promise<void> {
    const row = await this.articleVariantStockRepository.findOne({
      where: { articleVariantId },
    });
    if (!row || row.quantity < quantity) {
      throw new BadRequestException(
        `Stock insuficient de variant al magatzem. Disponible: ${row?.quantity ?? 0}`,
      );
    }
    row.quantity -= quantity;
    if (row.quantity === 0) {
      await this.articleVariantStockRepository.save(row);
    } else {
      await this.articleVariantStockRepository.save(row);
    }
    const warehouse = await this.getDefaultWarehouse();
    if (warehouse) {
      await this.syncSalesPointAggregate(warehouse.id, articleId);
    }
  }

  private async restoreWarehouseVariant(
    articleVariantId: string,
    quantity: number,
    articleId: string,
  ): Promise<void> {
    let row = await this.articleVariantStockRepository.findOne({
      where: { articleVariantId },
    });
    if (!row) {
      row = this.articleVariantStockRepository.create({
        articleVariantId,
        quantity,
      });
    } else {
      row.quantity += quantity;
    }
    await this.articleVariantStockRepository.save(row);
    const warehouse = await this.getDefaultWarehouse();
    if (warehouse) {
      await this.syncSalesPointAggregate(warehouse.id, articleId);
    }
  }

  private async reduceVariantAtSalesPoint(
    salesPointId: string,
    articleVariantId: string,
    quantity: number,
    articleId: string,
    warehouseId: string | null,
  ): Promise<void> {
    if (warehouseId && salesPointId === warehouseId) {
      await this.reduceWarehouseVariant(articleVariantId, quantity, articleId);
      return;
    }
    const row = await this.salesPointVariantStockRepository.findOne({
      where: { salesPointId, articleVariantId },
    });
    if (!row || row.quantity < quantity) {
      throw new BadRequestException(
        `Stock insuficient de variant al punt. Disponible: ${row?.quantity ?? 0}`,
      );
    }
    row.quantity -= quantity;
    if (row.quantity === 0) {
      await this.salesPointVariantStockRepository.remove(row);
    } else {
      await this.salesPointVariantStockRepository.save(row);
    }
    await this.syncSalesPointAggregate(salesPointId, articleId);
  }

  private async restoreVariantAtSalesPoint(
    salesPointId: string,
    articleVariantId: string,
    quantity: number,
    articleId: string,
    warehouseId: string | null,
  ): Promise<void> {
    if (warehouseId && salesPointId === warehouseId) {
      await this.restoreWarehouseVariant(articleVariantId, quantity, articleId);
      return;
    }
    let row = await this.salesPointVariantStockRepository.findOne({
      where: { salesPointId, articleVariantId },
    });
    if (!row) {
      row = this.salesPointVariantStockRepository.create({
        salesPointId,
        articleVariantId,
        quantity,
      });
    } else {
      row.quantity += quantity;
    }
    await this.salesPointVariantStockRepository.save(row);
    await this.syncSalesPointAggregate(salesPointId, articleId);
  }

  private async getVariantQtyAtFrom(
    fromType: 'point' | 'fair',
    fromId: string,
    articleVariantId: string,
    articleId: string,
    warehouseId: string | null,
  ): Promise<number> {
    if (fromType === 'fair') {
      return this.fairsService.getVariantQuantityAtFair(fromId, articleVariantId);
    }
    return this.getVariantQuantityAtPoint(fromId, articleVariantId, warehouseId);
  }

  private async reduceVariantFrom(
    fromType: 'point' | 'fair',
    fromId: string,
    line: MoveStockVariantLine,
    articleId: string,
    warehouseId: string | null,
  ): Promise<void> {
    if (fromType === 'fair') {
      await this.fairsService.reduceFairVariant(
        fromId,
        line.articleVariantId,
        line.quantity,
        articleId,
      );
      return;
    }
    await this.reduceVariantAtSalesPoint(
      fromId,
      line.articleVariantId,
      line.quantity,
      articleId,
      warehouseId,
    );
  }

  private async restoreVariantTo(
    toType: 'point' | 'fair',
    toId: string,
    line: MoveStockVariantLine,
    articleId: string,
    warehouseId: string | null,
  ): Promise<void> {
    if (toType === 'fair') {
      await this.fairsService.restoreFairVariant(
        toId,
        line.articleVariantId,
        line.quantity,
        articleId,
      );
      return;
    }
    await this.restoreVariantAtSalesPoint(
      toId,
      line.articleVariantId,
      line.quantity,
      articleId,
      warehouseId,
    );
  }

  async getAvailableStock(articleId: string): Promise<number> {
    return this.getUnassignedStock(articleId);
  }

  async getAvailableForAddStock(destinationId: string): Promise<
    {
      articleId: string;
      ownReference: string;
      description: string;
      quantityAvailable: number;
      quantityAtDestination: number;
    }[]
  > {
    await this.findOne(destinationId);
    const warehouse = await this.getDefaultWarehouse();
    if (!warehouse) return [];

    const isWarehouse = destinationId === warehouse.id;

    if (isWarehouse) {
      const warehouseStock = await this.stockRepository.find({
        where: { salesPointId: warehouse.id },
        relations: ['article'],
      });
      const destMap = new Map(
        warehouseStock.map((s) => [s.articleId, s.quantity]),
      );
      const articles = await this.articleRepository.find({
        where: {},
        order: { ownReference: 'ASC' },
      });
      const result: {
        articleId: string;
        ownReference: string;
        description: string;
        quantityAvailable: number;
        quantityAtDestination: number;
      }[] = [];
      for (const a of articles) {
        const unassigned = await this.getUnassignedStock(a.id);
        if (unassigned > 0) {
          result.push({
            articleId: a.id,
            ownReference: a.ownReference,
            description: a.description,
            quantityAvailable: unassigned,
            quantityAtDestination: destMap.get(a.id) ?? 0,
          });
        }
      }
      return result;
    }

    const [warehouseStock, destStock] = await Promise.all([
      this.getStock(warehouse.id),
      this.getStock(destinationId),
    ]);
    const destMap = new Map(destStock.map((s) => [s.articleId, s.quantity]));
    return warehouseStock
      .filter((s) => s.quantity > 0 && s.article)
      .map((s) => ({
        articleId: s.articleId,
        ownReference: s.article.ownReference,
        description: s.article.description,
        quantityAvailable: s.quantity,
        quantityAtDestination: destMap.get(s.articleId) ?? 0,
      }))
      .sort((x, y) => x.ownReference.localeCompare(y.ownReference));
  }

  private async getUnassignedStock(articleId: string): Promise<number> {
    const article = await this.articleRepository.findOne({
      where: { id: articleId },
    });
    if (!article) {
      throw new NotFoundException(`Artículo con ID ${articleId} no encontrado`);
    }

    const [salesPointsResult, fairStockResult] = await Promise.all([
      this.stockRepository
        .createQueryBuilder('sps')
        .select('COALESCE(SUM(sps.quantity), 0)', 'total')
        .where('sps.article_id = :articleId', { articleId })
        .getRawOne(),
      this.fairStockRepository
        .createQueryBuilder('fs')
        .select('COALESCE(SUM(fs.quantity), 0)', 'total')
        .where('fs.article_id = :articleId', { articleId })
        .getRawOne(),
    ]);

    const assignedToPoints = parseInt(salesPointsResult?.total || '0', 10);
    const assignedToFairs = parseInt(fairStockResult?.total || '0', 10);
    const assigned = assignedToPoints + assignedToFairs;
    return Math.max(0, article.stock - assigned);
  }

  async assignStock(
    salesPointId: string,
    dto: AssignStockDto,
  ): Promise<SalesPointStock> {
    await this.findOne(salesPointId);

    const article = await this.articleRepository.findOne({
      where: { id: dto.articleId },
    });
    if (!article) {
      throw new NotFoundException(
        `Artículo con ID ${dto.articleId} no encontrado`,
      );
    }

    const warehouse = await this.getDefaultWarehouse();
    const existing = await this.stockRepository.findOne({
      where: { salesPointId, articleId: dto.articleId },
    });

    const currentAtPoint = existing?.quantity ?? 0;
    const delta = dto.quantity - currentAtPoint;

    const isWarehouse = warehouse && salesPointId === warehouse.id;

    if (delta <= 0) {
      if (existing) {
        const toRestore = -delta;
        if (!isWarehouse && warehouse && toRestore > 0) {
          await this.restoreStock(warehouse.id, dto.articleId, toRestore);
        }
        existing.quantity = dto.quantity;
        if (dto.quantity === 0) {
          await this.stockRepository.remove(existing);
          return existing;
        }
        return this.stockRepository.save(existing);
      }
      if (dto.quantity === 0) {
        const empty = this.stockRepository.create({
          salesPointId,
          articleId: dto.articleId,
          quantity: 0,
        });
        return empty;
      }
    }

    const available = isWarehouse
      ? await this.getUnassignedStock(dto.articleId)
      : warehouse
        ? await this.getStockAtPoint(warehouse.id, dto.articleId)
        : 0;

    if (delta > available) {
      throw new BadRequestException(
        `Stock insuficient. Disponible al magatzem: ${available}, sol·licitat: ${delta} (actual al punt: ${currentAtPoint})`,
      );
    }

    if (!isWarehouse && warehouse && delta > 0) {
      await this.reduceStock(warehouse.id, dto.articleId, delta);
    }

    if (existing) {
      existing.quantity = dto.quantity;
      return this.stockRepository.save(existing);
    }

    const stock = this.stockRepository.create({
      salesPointId,
      articleId: dto.articleId,
      quantity: dto.quantity,
    });
    return this.stockRepository.save(stock);
  }

  async assignStockBatch(
    salesPointId: string,
    dto: AssignStockBatchDto,
  ): Promise<SalesPointStock[]> {
    await this.findOne(salesPointId);
    const results: SalesPointStock[] = [];

    for (const item of dto.items) {
      const result = await this.assignStock(salesPointId, {
        articleId: item.articleId,
        quantity: item.quantity,
      });
      results.push(result);
    }

    return results;
  }

  async getStockAtPoint(
    salesPointId: string,
    articleId: string,
  ): Promise<number> {
    const sps = await this.stockRepository.findOne({
      where: { salesPointId, articleId },
    });
    return sps?.quantity ?? 0;
  }

  async reduceStock(
    salesPointId: string,
    articleId: string,
    quantity: number,
  ): Promise<void> {
    const sps = await this.stockRepository.findOne({
      where: { salesPointId, articleId },
    });

    if (!sps || sps.quantity < quantity) {
      const available = sps?.quantity ?? 0;
      throw new BadRequestException(
        `Stock insuficiente en el punto de venta. Disponible: ${available}, solicitado: ${quantity}`,
      );
    }

    sps.quantity -= quantity;
    if (sps.quantity === 0) {
      await this.stockRepository.remove(sps);
    } else {
      await this.stockRepository.save(sps);
    }
  }

  async restoreStock(
    salesPointId: string,
    articleId: string,
    quantity: number,
  ): Promise<void> {
    const sps = await this.stockRepository.findOne({
      where: { salesPointId, articleId },
    });

    if (sps) {
      sps.quantity += quantity;
      await this.stockRepository.save(sps);
    } else {
      const newStock = this.stockRepository.create({
        salesPointId,
        articleId,
        quantity,
      });
      await this.stockRepository.save(newStock);
    }
  }

  async updateStockAtPoint(
    salesPointId: string,
    articleId: string,
    newQuantity: number,
  ): Promise<SalesPointStock> {
    if (newQuantity < 1) {
      throw new BadRequestException('La quantitat mínima és 1');
    }

    const warehouse = await this.getDefaultWarehouse();
    if (!warehouse) {
      throw new BadRequestException('No hi ha magatzem configurat');
    }

    const sps = await this.stockRepository.findOne({
      where: { salesPointId, articleId },
      relations: ['article'],
    });
    if (!sps) {
      throw new NotFoundException(`L'article no està al punt de venta`);
    }

    const currentQty = sps.quantity;
    const delta = newQuantity - currentQty;

    if (delta === 0) {
      return sps;
    }

    if (delta < 0) {
      const toRestore = currentQty - newQuantity;
      await this.restoreStock(warehouse.id, articleId, toRestore);
      sps.quantity = newQuantity;
      return this.stockRepository.save(sps);
    }

    const warehouseStock = await this.getStockAtPoint(warehouse.id, articleId);
    const maxQty = currentQty + warehouseStock;
    if (newQuantity > maxQty) {
      throw new BadRequestException(
        `Stock insuficient al magatzem. Màxim: ${maxQty}`,
      );
    }

    await this.reduceStock(warehouse.id, articleId, delta);
    sps.quantity = newQuantity;
    return this.stockRepository.save(sps);
  }

  async removeFromPoint(
    salesPointId: string,
    articleId: string,
  ): Promise<void> {
    const warehouse = await this.getDefaultWarehouse();
    if (!warehouse) {
      throw new BadRequestException('No hi ha magatzem configurat');
    }

    const sps = await this.stockRepository.findOne({
      where: { salesPointId, articleId },
    });
    if (!sps) {
      throw new NotFoundException(`L'article no està al punt de venta`);
    }

    await this.restoreStock(warehouse.id, articleId, sps.quantity);
    await this.stockRepository.remove(sps);
  }

  async moveStock(
    fromType: 'point' | 'fair',
    fromId: string,
    toType: 'point' | 'fair',
    toId: string,
    items: MoveStockItemDto[],
  ): Promise<void> {
    const warehouse = await this.getDefaultWarehouse();
    const warehouseId = warehouse?.id ?? null;

    for (const item of items) {
      const article = await this.articleRepository.findOne({
        where: { id: item.articleId },
      });
      if (!article) {
        throw new NotFoundException(`Article ${item.articleId} no trobat`);
      }

      assertMoveItemShape(
        article.hasVariants,
        item.quantity,
        item.variants,
      );

      if (article.hasVariants) {
        const allowed = await this.getVariantIdsForArticle(item.articleId);
        const lines = normalizeMoveVariantLines(item.variants!, allowed);
        for (const line of lines) {
          const available = await this.getVariantQtyAtFrom(
            fromType,
            fromId,
            line.articleVariantId,
            item.articleId,
            warehouseId,
          );
          if (available < line.quantity) {
            throw new BadRequestException(
              `Stock insuficient per variant ${line.articleVariantId}. Disponible: ${available}`,
            );
          }
        }
      } else {
        const getStockAtFrom =
          fromType === 'fair'
            ? (id: string, artId: string) =>
                this.fairsService.getStockAtFair(id, artId)
            : (id: string, artId: string) => this.getStockAtPoint(id, artId);
        const stockAtFrom = await getStockAtFrom(fromId, item.articleId);
        if (stockAtFrom < item.quantity!) {
          throw new BadRequestException(
            `Stock insuficient per l'article ${item.articleId}. Disponible: ${stockAtFrom}`,
          );
        }
      }
    }

    for (const item of items) {
      const article = await this.articleRepository.findOne({
        where: { id: item.articleId },
      });
      if (!article) {
        continue;
      }

      if (article.hasVariants) {
        const allowed = await this.getVariantIdsForArticle(item.articleId);
        const lines = normalizeMoveVariantLines(item.variants!, allowed);
        for (const line of lines) {
          await this.reduceVariantFrom(
            fromType,
            fromId,
            line,
            item.articleId,
            warehouseId,
          );
          await this.restoreVariantTo(
            toType,
            toId,
            line,
            item.articleId,
            warehouseId,
          );
        }
        continue;
      }

      if (fromType === 'fair') {
        await this.fairsService.reduceFairStock(
          fromId,
          item.articleId,
          item.quantity!,
        );
      } else {
        await this.reduceStock(fromId, item.articleId, item.quantity!);
      }

      if (toType === 'fair') {
        await this.fairsService.restoreFairStock(
          toId,
          item.articleId,
          item.quantity!,
        );
      } else {
        await this.restoreStock(toId, item.articleId, item.quantity!);
      }
    }
  }
}
