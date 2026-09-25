import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fair } from './entities/fair.entity';
import { FairStock } from './entities/fair-stock.entity';
import { FairVariantStock } from './entities/fair-variant-stock.entity';
import { CreateFairDto } from './dto/create-fair.dto';
import { UpdateFairDto } from './dto/update-fair.dto';
import { UpdateFairStockDto } from './dto/update-fair-stock.dto';
import { Article } from '../articles/entities/article.entity';
import { ArticleVariant } from '../articles/entities/article-variant.entity';
import {
  SalesPointsService,
  StockVariantLineView,
} from '../sales-points/sales-points.service';

export type FairStockEnriched = FairStock & {
  maxQuantity: number;
  variants?: StockVariantLineView[];
};

@Injectable()
export class FairsService {
  constructor(
    @InjectRepository(Fair)
    private fairRepository: Repository<Fair>,
    @InjectRepository(FairStock)
    private fairStockRepository: Repository<FairStock>,
    @InjectRepository(FairVariantStock)
    private fairVariantStockRepository: Repository<FairVariantStock>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    @InjectRepository(ArticleVariant)
    private articleVariantRepository: Repository<ArticleVariant>,
    @Inject(forwardRef(() => SalesPointsService))
    private salesPointsService: SalesPointsService,
  ) {}

  async create(dto: CreateFairDto): Promise<Fair> {
    const fair = this.fairRepository.create({
      name: dto.name,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    });
    const saved = await this.fairRepository.save(fair);

    return this.findOne(saved.id);
  }

  async findAll(): Promise<Fair[]> {
    return this.fairRepository.find({
      order: { startDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Fair> {
    const fair = await this.fairRepository.findOne({
      where: { id },
      relations: ['stock', 'stock.article'],
    });
    if (!fair) throw new NotFoundException('Fira no trobada');
    return fair;
  }

  async update(id: string, dto: UpdateFairDto): Promise<Fair> {
    const fair = await this.findOne(id);
    Object.assign(fair, {
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : fair.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : fair.endDate,
    });
    return this.fairRepository.save(fair);
  }

  async remove(id: string): Promise<void> {
    const fair = await this.findOne(id);
    await this.fairRepository.remove(fair);
  }

  async getStock(fairId: string): Promise<FairStockEnriched[]> {
    await this.findOne(fairId);
    const items = await this.fairStockRepository.find({
      where: { fairId },
      relations: ['article'],
      order: { articleId: 'ASC' },
    });
    const warehouse = await this.salesPointsService.getDefaultWarehouse();
    const result: FairStockEnriched[] = [];
    for (const item of items) {
      const warehouseStock = warehouse
        ? await this.salesPointsService.getStockAtPoint(
            warehouse.id,
            item.articleId,
          )
        : 0;
      const enriched: FairStockEnriched = {
        ...item,
        maxQuantity: item.quantity + warehouseStock,
      };
      if (item.article?.hasVariants) {
        enriched.variants = await this.buildVariantLinesForFair(
          fairId,
          item.articleId,
        );
      }
      result.push(enriched);
    }
    return result;
  }

  async buildVariantLinesForFair(
    fairId: string,
    articleId: string,
  ): Promise<StockVariantLineView[]> {
    const variants = await this.articleVariantRepository.find({
      where: { articleId },
      order: { sortOrder: 'ASC', label: 'ASC' },
    });
    const lines: StockVariantLineView[] = [];
    for (const variant of variants) {
      const quantity = await this.getVariantQuantityAtFair(
        fairId,
        variant.id,
      );
      if (quantity <= 0) {
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

  async getVariantQuantityAtFair(
    fairId: string,
    articleVariantId: string,
  ): Promise<number> {
    const row = await this.fairVariantStockRepository.findOne({
      where: { fairId, articleVariantId },
    });
    return row?.quantity ?? 0;
  }

  private async syncFairAggregate(fairId: string, articleId: string): Promise<void> {
    const variants = await this.articleVariantRepository.find({
      where: { articleId },
      select: ['id'],
    });
    let total = 0;
    for (const v of variants) {
      total += await this.getVariantQuantityAtFair(fairId, v.id);
    }
    const existing = await this.fairStockRepository.findOne({
      where: { fairId, articleId },
    });
    if (total <= 0) {
      if (existing) {
        await this.fairStockRepository.remove(existing);
      }
      return;
    }
    if (existing) {
      existing.quantity = total;
      await this.fairStockRepository.save(existing);
    } else {
      await this.fairStockRepository.save(
        this.fairStockRepository.create({ fairId, articleId, quantity: total }),
      );
    }
  }

  async reduceFairVariant(
    fairId: string,
    articleVariantId: string,
    quantity: number,
    articleId: string,
  ): Promise<void> {
    const row = await this.fairVariantStockRepository.findOne({
      where: { fairId, articleVariantId },
    });
    if (!row || row.quantity < quantity) {
      throw new BadRequestException(
        `Stock insuficient de variant a la fira. Disponible: ${row?.quantity ?? 0}`,
      );
    }
    row.quantity -= quantity;
    if (row.quantity === 0) {
      await this.fairVariantStockRepository.remove(row);
    } else {
      await this.fairVariantStockRepository.save(row);
    }
    await this.syncFairAggregate(fairId, articleId);
  }

  async restoreFairVariant(
    fairId: string,
    articleVariantId: string,
    quantity: number,
    articleId: string,
  ): Promise<void> {
    let row = await this.fairVariantStockRepository.findOne({
      where: { fairId, articleVariantId },
    });
    if (!row) {
      row = this.fairVariantStockRepository.create({
        fairId,
        articleVariantId,
        quantity,
      });
    } else {
      row.quantity += quantity;
    }
    await this.fairVariantStockRepository.save(row);
    await this.syncFairAggregate(fairId, articleId);
  }

  async updateStock(
    fairId: string,
    dto: UpdateFairStockDto,
  ): Promise<FairStock[]> {
    await this.findOne(fairId);
    const warehouse = await this.salesPointsService.getDefaultWarehouse();
    if (!warehouse) {
      throw new BadRequestException('No hi ha magatzem configurat');
    }

    const results: FairStock[] = [];
    for (const item of dto.items) {
      const article = await this.articleRepository.findOne({
        where: { id: item.articleId },
      });
      if (!article)
        throw new NotFoundException(`Article ${item.articleId} no trobat`);

      const warehouseQty = await this.salesPointsService.getStockAtPoint(
        warehouse.id,
        item.articleId,
      );
      const maxQty = warehouseQty;
      if (item.quantity > maxQty) {
        throw new BadRequestException(
          `Stock insuficient al magatzem per ${article.ownReference}. Màxim: ${maxQty}`,
        );
      }

      const existing = await this.fairStockRepository.findOne({
        where: { fairId, articleId: item.articleId },
      });

      if (item.quantity === 0) {
        if (existing) await this.fairStockRepository.remove(existing);
        continue;
      }

      if (existing) {
        const delta = item.quantity - existing.quantity;
        if (delta > 0 && delta > warehouseQty) {
          throw new BadRequestException(
            `Stock insuficient al magatzem per ${article.ownReference}`,
          );
        }
        existing.quantity = item.quantity;
        results.push(await this.fairStockRepository.save(existing));
        if (delta > 0) {
          await this.salesPointsService.reduceStock(
            warehouse.id,
            item.articleId,
            delta,
          );
        } else if (delta < 0) {
          await this.salesPointsService.restoreStock(
            warehouse.id,
            item.articleId,
            -delta,
          );
        }
      } else {
        if (item.quantity > warehouseQty) {
          throw new BadRequestException(
            `Stock insuficient al magatzem per ${article.ownReference}`,
          );
        }
        const fs = this.fairStockRepository.create({
          fairId,
          articleId: item.articleId,
          quantity: item.quantity,
        });
        results.push(await this.fairStockRepository.save(fs));
        await this.salesPointsService.reduceStock(
          warehouse.id,
          item.articleId,
          item.quantity,
        );
      }
      await this.salesPointsService.syncArticleStockTotal(item.articleId);
    }
    return results;
  }

  async getStockAtFair(fairId: string, articleId: string): Promise<number> {
    const fs = await this.fairStockRepository.findOne({
      where: { fairId, articleId },
    });
    return fs?.quantity ?? 0;
  }

  async reduceFairStock(
    fairId: string,
    articleId: string,
    quantity: number,
  ): Promise<void> {
    const fs = await this.fairStockRepository.findOne({
      where: { fairId, articleId },
    });
    if (!fs || fs.quantity < quantity) {
      throw new BadRequestException('Stock insuficient a la fira');
    }
    fs.quantity -= quantity;
    if (fs.quantity === 0) {
      await this.fairStockRepository.remove(fs);
    } else {
      await this.fairStockRepository.save(fs);
    }
  }

  async restoreFairStock(
    fairId: string,
    articleId: string,
    quantity: number,
  ): Promise<void> {
    const fs = await this.fairStockRepository.findOne({
      where: { fairId, articleId },
    });
    if (fs) {
      fs.quantity += quantity;
      await this.fairStockRepository.save(fs);
    } else {
      await this.fairStockRepository.save(
        this.fairStockRepository.create({
          fairId,
          articleId,
          quantity,
        }),
      );
    }
  }

  async finalize(fairId: string): Promise<{ message: string }> {
    const fair = await this.findOne(fairId);
    const warehouse = await this.salesPointsService.getDefaultWarehouse();
    if (!warehouse) {
      throw new BadRequestException('No hi ha magatzem configurat');
    }

    const variantItems = await this.fairVariantStockRepository.find({
      where: { fairId },
      relations: ['articleVariant'],
    });

    const articleIdsToSync = new Set<string>();

    for (const row of variantItems) {
      const articleId = row.articleVariant?.articleId;
      if (!articleId) {
        continue;
      }
      articleIdsToSync.add(articleId);
      await this.salesPointsService.restoreWarehouseVariantFromFair(
        row.articleVariantId,
        row.quantity,
        articleId,
      );
      await this.fairVariantStockRepository.remove(row);
    }

    const items = await this.fairStockRepository.find({
      where: { fairId },
      relations: ['article'],
    });

    for (const item of items) {
      if (item.article?.hasVariants) {
        await this.fairStockRepository.remove(item);
        continue;
      }
      articleIdsToSync.add(item.articleId);
      await this.salesPointsService.restoreStock(
        warehouse.id,
        item.articleId,
        item.quantity,
      );
      await this.fairStockRepository.remove(item);
    }

    for (const articleId of articleIdsToSync) {
      await this.salesPointsService.syncArticleStockTotal(articleId);
    }

    return {
      message: `Fira "${fair.name}" finalitzada. Stock retornat al magatzem.`,
    };
  }

  async reopen(fairId: string): Promise<{ message: string }> {
    const fair = await this.findOne(fairId);
    const warehouse = await this.salesPointsService.getDefaultWarehouse();
    if (!warehouse) {
      throw new BadRequestException('No hi ha magatzem configurat');
    }

    const existingStock = await this.fairStockRepository.find({
      where: { fairId },
    });
    if (existingStock.length > 0) {
      throw new BadRequestException('La fira ja té stock assignat');
    }

    const warehouseStock = await this.salesPointsService.getStock(warehouse.id);
    let imported = 0;
    for (const item of warehouseStock) {
      if (item.quantity <= 0 || !item.articleId) {
        continue;
      }
      if (item.article?.hasVariants) {
        const lines =
          await this.salesPointsService.buildVariantLinesForSalesPoint(
            item.articleId,
            warehouse.id,
            warehouse.id,
          );
        for (const line of lines) {
          if (line.quantity <= 0) {
            continue;
          }
          await this.salesPointsService.reduceWarehouseVariantForFair(
            line.articleVariantId,
            line.quantity,
            item.articleId,
          );
          await this.restoreFairVariant(
            fairId,
            line.articleVariantId,
            line.quantity,
            item.articleId,
          );
        }
        imported++;
        await this.salesPointsService.syncArticleStockTotal(item.articleId);
        continue;
      }

      await this.fairStockRepository.save(
        this.fairStockRepository.create({
          fairId,
          articleId: item.articleId,
          quantity: item.quantity,
        }),
      );
      await this.salesPointsService.reduceStock(
        warehouse.id,
        item.articleId,
        item.quantity,
      );
      imported++;
      await this.salesPointsService.syncArticleStockTotal(item.articleId);
    }

    return {
      message: `Fira "${fair.name}" reoberta. ${imported} articles importats del magatzem.`,
    };
  }
}
