import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Albaran } from './entities/albaran.entity';
import { AlbaranItem } from './entities/albaran-item.entity';
import { CreateAlbaranDto } from './dto/create-albaran.dto';
import { UpdateAlbaranDto } from './dto/update-albaran.dto';
import { SearchAlbaranDto } from './dto/search-albaran.dto';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Article } from '../articles/entities/article.entity';
import { SalesPointsService } from '../sales-points/sales-points.service';

@Injectable()
export class AlbaranesService {
  constructor(
    @InjectRepository(Albaran)
    private albaranRepository: Repository<Albaran>,
    @InjectRepository(AlbaranItem)
    private albaranItemRepository: Repository<AlbaranItem>,
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    private salesPointsService: SalesPointsService,
  ) {}

  private async addInboundToWarehouse(
    articleId: string,
    quantity: number,
  ): Promise<void> {
    const warehouse = await this.salesPointsService.getDefaultWarehouse();
    if (!warehouse) {
      throw new BadRequestException('No hi ha magatzem configurat');
    }
    await this.salesPointsService.restoreStock(
      warehouse.id,
      articleId,
      quantity,
    );
    await this.salesPointsService.syncArticleStockTotal(articleId);
  }

  private async removeInboundFromWarehouse(
    articleId: string,
    quantity: number,
  ): Promise<void> {
    const warehouse = await this.salesPointsService.getDefaultWarehouse();
    if (!warehouse) {
      throw new BadRequestException('No hi ha magatzem configurat');
    }
    await this.salesPointsService.reduceStock(
      warehouse.id,
      articleId,
      quantity,
    );
    await this.salesPointsService.syncArticleStockTotal(articleId);
  }

  async create(createAlbaranDto: CreateAlbaranDto): Promise<Albaran> {
    const existingAlbaran = await this.albaranRepository.findOne({
      where: { albaranNumber: createAlbaranDto.albaranNumber },
    });

    if (existingAlbaran) {
      throw new ConflictException(
        `Ya existe un albarán con el número ${createAlbaranDto.albaranNumber}`,
      );
    }

    const supplier = await this.supplierRepository.findOne({
      where: { id: createAlbaranDto.supplierId },
    });

    if (!supplier) {
      throw new NotFoundException(
        `Proveedor con ID ${createAlbaranDto.supplierId} no encontrado`,
      );
    }

    for (const itemDto of createAlbaranDto.items) {
      const article = await this.articleRepository.findOne({
        where: { id: itemDto.articleId },
      });

      if (!article) {
        throw new NotFoundException(
          `Artículo con ID ${itemDto.articleId} no encontrado`,
        );
      }
      if (article.hasVariants) {
        throw new ConflictException(
          'Article amb variants: ajustar via formulari',
        );
      }
    }

    const albaran = this.albaranRepository.create({
      albaranNumber: createAlbaranDto.albaranNumber,
      supplier: supplier,
      date: new Date(createAlbaranDto.date),
      condition: createAlbaranDto.condition || null,
    });

    const savedAlbaran = await this.albaranRepository.save(albaran);

    const items: AlbaranItem[] = [];
    for (const itemDto of createAlbaranDto.items) {
      const article = await this.articleRepository.findOne({
        where: { id: itemDto.articleId },
      });

      const albaranItem = this.albaranItemRepository.create({
        albaran: savedAlbaran,
        article: article!,
        quantity: itemDto.quantity,
        ivaType: itemDto.ivaType || null,
        costPrice: itemDto.costPrice,
        margin: itemDto.margin,
        pvp: itemDto.pvp,
      });

      const savedItem = await this.albaranItemRepository.save(albaranItem);
      items.push(savedItem);

      await this.addInboundToWarehouse(itemDto.articleId, itemDto.quantity);
    }

    return this.albaranRepository.findOne({
      where: { id: savedAlbaran.id },
      relations: ['supplier', 'items', 'items.article'],
    }) as Promise<Albaran>;
  }

  async findAll(): Promise<Albaran[]> {
    return this.albaranRepository.find({
      relations: ['supplier', 'items', 'items.article'],
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Albaran> {
    const albaran = await this.albaranRepository.findOne({
      where: { id },
      relations: ['supplier', 'items', 'items.article'],
    });

    if (!albaran) {
      throw new NotFoundException(`Albarán con ID ${id} no encontrado`);
    }

    return albaran;
  }

  async search(searchDto: SearchAlbaranDto): Promise<Albaran[]> {
    const queryBuilder = this.albaranRepository
      .createQueryBuilder('albaran')
      .leftJoinAndSelect('albaran.supplier', 'supplier')
      .leftJoinAndSelect('albaran.items', 'items')
      .leftJoinAndSelect('items.article', 'article');

    if (searchDto.albaranNumber) {
      queryBuilder.andWhere('albaran.albaranNumber LIKE :albaranNumber', {
        albaranNumber: `%${searchDto.albaranNumber}%`,
      });
    }

    if (searchDto.supplierId) {
      queryBuilder.andWhere('albaran.supplier.id = :supplierId', {
        supplierId: searchDto.supplierId,
      });
    }

    if (searchDto.supplierName) {
      queryBuilder.andWhere('supplier.name ILIKE :supplierName', {
        supplierName: `%${searchDto.supplierName}%`,
      });
    }

    if (searchDto.dateFrom && searchDto.dateTo) {
      queryBuilder.andWhere('albaran.date BETWEEN :dateFrom AND :dateTo', {
        dateFrom: searchDto.dateFrom,
        dateTo: searchDto.dateTo,
      });
    } else if (searchDto.dateFrom) {
      queryBuilder.andWhere('albaran.date >= :dateFrom', {
        dateFrom: searchDto.dateFrom,
      });
    } else if (searchDto.dateTo) {
      queryBuilder.andWhere('albaran.date <= :dateTo', {
        dateTo: searchDto.dateTo,
      });
    }

    if (searchDto.condition) {
      queryBuilder.andWhere('albaran.condition = :condition', {
        condition: searchDto.condition,
      });
    }

    queryBuilder
      .orderBy('albaran.date', 'DESC')
      .addOrderBy('albaran.createdAt', 'DESC');

    return queryBuilder.getMany();
  }

  async update(
    id: string,
    updateAlbaranDto: UpdateAlbaranDto,
  ): Promise<Albaran> {
    const albaran = await this.findOne(id);

    if (
      updateAlbaranDto.albaranNumber &&
      updateAlbaranDto.albaranNumber !== albaran.albaranNumber
    ) {
      const existingAlbaran = await this.albaranRepository.findOne({
        where: { albaranNumber: updateAlbaranDto.albaranNumber },
      });

      if (existingAlbaran) {
        throw new ConflictException(
          `Ya existe un albarán con el número ${updateAlbaranDto.albaranNumber}`,
        );
      }
    }

    if (updateAlbaranDto.supplierId !== undefined) {
      const supplier = await this.supplierRepository.findOne({
        where: { id: updateAlbaranDto.supplierId },
      });

      if (!supplier) {
        throw new NotFoundException(
          `Proveedor con ID ${updateAlbaranDto.supplierId} no encontrado`,
        );
      }

      albaran.supplier = supplier;
    }

    Object.assign(albaran, {
      albaranNumber: updateAlbaranDto.albaranNumber ?? albaran.albaranNumber,
      date: updateAlbaranDto.date
        ? new Date(updateAlbaranDto.date)
        : albaran.date,
      condition: updateAlbaranDto.condition ?? albaran.condition,
    });

    if (updateAlbaranDto.items) {
      for (const existingItem of albaran.items) {
        await this.removeInboundFromWarehouse(
          existingItem.articleId,
          existingItem.quantity,
        );
        await this.albaranItemRepository.remove(existingItem);
      }

      const items: AlbaranItem[] = [];
      for (const itemDto of updateAlbaranDto.items) {
        const article = await this.articleRepository.findOne({
          where: { id: itemDto.articleId },
        });

        if (!article) {
          throw new NotFoundException(
            `Artículo con ID ${itemDto.articleId} no encontrado`,
          );
        }
        if (article.hasVariants) {
          throw new ConflictException(
            'Article amb variants: ajustar via formulari',
          );
        }

        const albaranItem = this.albaranItemRepository.create({
          albaran: albaran,
          article: article,
          quantity: itemDto.quantity,
          ivaType: itemDto.ivaType || null,
          costPrice: itemDto.costPrice,
          margin: itemDto.margin,
          pvp: itemDto.pvp,
        });

        const savedItem = await this.albaranItemRepository.save(albaranItem);
        items.push(savedItem);

        await this.addInboundToWarehouse(itemDto.articleId, itemDto.quantity);
      }

      albaran.items = items;
    }

    return this.albaranRepository.save(albaran);
  }

  async remove(id: string): Promise<void> {
    const albaran = await this.findOne(id);

    for (const item of albaran.items) {
      await this.removeInboundFromWarehouse(item.articleId, item.quantity);
    }

    await this.albaranRepository.remove(albaran);
  }
}
