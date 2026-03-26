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
import {
  AssignStockDto,
  AssignStockBatchDto,
} from './dto/assign-stock.dto';
import { FairsService } from '../fairs/fairs.service';

@Injectable()
export class SalesPointsService {
  constructor(
    @InjectRepository(SalesPoint)
    private salesPointRepository: Repository<SalesPoint>,
    @InjectRepository(SalesPointStock)
    private stockRepository: Repository<SalesPointStock>,
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

  async update(id: string, updateDto: UpdateSalesPointDto): Promise<SalesPoint> {
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
  ): Promise<(SalesPointStock & { maxQuantity: number })[]> {
    const items = await this.getStock(salesPointId);
    const warehouse = await this.getDefaultWarehouse();
    if (!warehouse) {
      return items.map((i) => ({ ...i, maxQuantity: i.quantity }));
    }

    const isWarehouse = salesPointId === warehouse.id;
    const result: (SalesPointStock & { maxQuantity: number })[] = [];

    for (const item of items) {
      let maxQuantity: number;
      if (isWarehouse) {
        // Al magatzem: màxim = actual + stock no assignat (considera punts + fires)
        const unassigned = await this.getUnassignedStock(item.articleId);
        maxQuantity = item.quantity + unassigned;
      } else {
        // Punt de venta: màxim = actual + stock al magatzem (origen)
        const warehouseStock = await this.getStockAtPoint(
          warehouse.id,
          item.articleId,
        );
        maxQuantity = item.quantity + warehouseStock;
      }
      result.push({ ...item, maxQuantity });
    }
    return result;
  }

  async getAvailableStock(articleId: string): Promise<number> {
    return this.getUnassignedStock(articleId);
  }

  async getAvailableForAddStock(
    destinationId: string,
  ): Promise<
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
    const destMap = new Map(
      destStock.map((s) => [s.articleId, s.quantity]),
    );
    return warehouseStock
      .filter((s) => s.quantity > 0 && s.article)
      .map((s) => ({
        articleId: s.articleId,
        ownReference: s.article!.ownReference,
        description: s.article!.description,
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
    items: { articleId: string; quantity: number }[],
  ): Promise<void> {
    const getStockAtFrom =
      fromType === 'fair'
        ? (id: string, artId: string) =>
            this.fairsService.getStockAtFair(id, artId)
        : (id: string, artId: string) =>
            this.getStockAtPoint(id, artId);

    for (const item of items) {
      const stockAtFrom = await getStockAtFrom(fromId, item.articleId);
      if (stockAtFrom < item.quantity) {
        throw new BadRequestException(
          `Stock insuficient per l'article ${item.articleId}. Disponible: ${stockAtFrom}`,
        );
      }
    }

    for (const item of items) {
      if (fromType === 'fair') {
        await this.fairsService.reduceFairStock(
          fromId,
          item.articleId,
          item.quantity,
        );
      } else {
        await this.reduceStock(fromId, item.articleId, item.quantity);
      }

      if (toType === 'fair') {
        await this.fairsService.restoreFairStock(
          toId,
          item.articleId,
          item.quantity,
        );
      } else {
        await this.restoreStock(toId, item.articleId, item.quantity);
      }
    }
  }
}
