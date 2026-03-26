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
import { CreateFairDto } from './dto/create-fair.dto';
import { UpdateFairDto } from './dto/update-fair.dto';
import { UpdateFairStockDto } from './dto/update-fair-stock.dto';
import { Article } from '../articles/entities/article.entity';
import { SalesPointsService } from '../sales-points/sales-points.service';

@Injectable()
export class FairsService {
  constructor(
    @InjectRepository(Fair)
    private fairRepository: Repository<Fair>,
    @InjectRepository(FairStock)
    private fairStockRepository: Repository<FairStock>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
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

    const warehouse = await this.salesPointsService.getDefaultWarehouse();
    if (warehouse) {
      const warehouseStock = await this.salesPointsService.getStock(
        warehouse.id,
      );
      for (const item of warehouseStock) {
        if (item.quantity > 0 && item.articleId) {
          await this.fairStockRepository.save(
            this.fairStockRepository.create({
              fairId: saved.id,
              articleId: item.articleId,
              quantity: item.quantity,
            }),
          );
        }
      }
    }

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

  async getStock(fairId: string): Promise<(FairStock & { maxQuantity: number })[]> {
    await this.findOne(fairId);
    const items = await this.fairStockRepository.find({
      where: { fairId },
      relations: ['article'],
      order: { articleId: 'ASC' },
    });
    const warehouse = await this.salesPointsService.getDefaultWarehouse();
    if (!warehouse) {
      return items.map((i) => ({ ...i, maxQuantity: i.quantity }));
    }
    const result: (FairStock & { maxQuantity: number })[] = [];
    for (const item of items) {
      const warehouseStock = await this.salesPointsService.getStockAtPoint(
        warehouse.id,
        item.articleId,
      );
      result.push({
        ...item,
        maxQuantity: item.quantity + warehouseStock,
      });
    }
    return result;
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

    const items = await this.fairStockRepository.find({
      where: { fairId },
    });

    for (const item of items) {
      await this.salesPointsService.restoreStock(
        warehouse.id,
        item.articleId,
        item.quantity,
      );
      await this.fairStockRepository.remove(item);
    }

    return {
      message: `Fira "${fair.name}" finalitzada. ${items.length} articles retornats al magatzem.`,
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

    const warehouseStock = await this.salesPointsService.getStock(
      warehouse.id,
    );
    let imported = 0;
    for (const item of warehouseStock) {
      if (item.quantity > 0 && item.articleId) {
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
      }
    }

    return {
      message: `Fira "${fair.name}" reoberta. ${imported} articles importats del magatzem.`,
    };
  }
}
