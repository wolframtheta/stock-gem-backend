import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { SearchSaleDto } from './dto/search-sale.dto';
import { Client } from '../clients/entities/client.entity';
import { User } from '../auth/entities/user.entity';
import { Article } from '../articles/entities/article.entity';
import { ArticleVariant } from '../articles/entities/article-variant.entity';
import { SalesPointsService } from '../sales-points/sales-points.service';
import { FairsService } from '../fairs/fairs.service';
import { Fair } from '../fairs/entities/fair.entity';
import { SalesPoint } from '../sales-points/entities/sales-point.entity';
import {
  assertSaleItemVariantRules,
  resolveSaleLocation,
} from './create-sale-location.util';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private saleItemRepository: Repository<SaleItem>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    @InjectRepository(ArticleVariant)
    private articleVariantRepository: Repository<ArticleVariant>,
    private salesPointsService: SalesPointsService,
    private fairsService: FairsService,
  ) {}

  async create(createSaleDto: CreateSaleDto): Promise<Sale> {
    const location = resolveSaleLocation(
      createSaleDto.salesPointId,
      createSaleDto.fairId,
    );

    const saleNumber = await this.generateSaleNumber();
    const ticketNumber = await this.generateTicketNumber();

    let client: Client | null = null;
    if (createSaleDto.clientId) {
      client = await this.clientRepository.findOne({
        where: { id: createSaleDto.clientId },
      });
      if (!client) {
        throw new NotFoundException(
          `Cliente con ID ${createSaleDto.clientId} no encontrado`,
        );
      }
    }

    let seller: User | null = null;
    if (createSaleDto.sellerId) {
      seller = await this.userRepository.findOne({
        where: { id: createSaleDto.sellerId },
      });
      if (!seller) {
        throw new NotFoundException(
          `Usuario con ID ${createSaleDto.sellerId} no encontrado`,
        );
      }
    }

    let salesPoint: SalesPoint | null = null;
    let fair: Fair | null = null;
    if (location.kind === 'point') {
      salesPoint = await this.salesPointsService.findOne(location.salesPointId);
    } else {
      fair = await this.fairsService.findOne(location.fairId);
    }

    for (const itemDto of createSaleDto.items) {
      const article = await this.articleRepository.findOne({
        where: { id: itemDto.articleId },
      });
      if (!article) {
        throw new NotFoundException(
          `Artículo con ID ${itemDto.articleId} no encontrado`,
        );
      }

      assertSaleItemVariantRules(article.hasVariants, itemDto.articleVariantId);

      if (itemDto.articleVariantId) {
        const variant = await this.articleVariantRepository.findOne({
          where: { id: itemDto.articleVariantId, articleId: article.id },
        });
        if (!variant) {
          throw new BadRequestException(
            `La variant ${itemDto.articleVariantId} no pertany a l'article`,
          );
        }
      }

      await this.assertStockForSale(
        location,
        article,
        itemDto.quantity,
        itemDto.articleVariantId,
      );
    }

    const sale = this.saleRepository.create({
      salesPoint,
      fair,
      fairId: fair?.id ?? null,
      saleNumber,
      ticketNumber,
      client,
      seller,
      saleDate: new Date(createSaleDto.saleDate),
      saleTime: createSaleDto.saleTime || null,
      paymentType: createSaleDto.paymentType,
      totalDiscount: createSaleDto.totalDiscount,
      totalAmount: createSaleDto.totalAmount,
    });

    const savedSale = await this.saleRepository.save(sale);

    for (const itemDto of createSaleDto.items) {
      const article = await this.articleRepository.findOne({
        where: { id: itemDto.articleId },
      });

      const saleItem = this.saleItemRepository.create({
        sale: savedSale,
        article: article!,
        articleVariantId: itemDto.articleVariantId ?? null,
        quantity: itemDto.quantity,
        unitPrice: itemDto.unitPrice,
        discount: itemDto.discount,
        totalPrice: itemDto.totalPrice,
      });

      await this.saleItemRepository.save(saleItem);

      await this.deductStockForSale(
        location,
        article!,
        itemDto.quantity,
        itemDto.articleVariantId,
      );

      await this.salesPointsService.syncArticleStockTotal(itemDto.articleId);
    }

    return this.saleRepository.findOne({
      where: { id: savedSale.id },
      relations: [
        'salesPoint',
        'fair',
        'client',
        'seller',
        'items',
        'items.article',
      ],
    }) as Promise<Sale>;
  }

  private async assertStockForSale(
    location: ReturnType<typeof resolveSaleLocation>,
    article: Article,
    quantity: number,
    articleVariantId?: string,
  ): Promise<void> {
    if (location.kind === 'point') {
      if (article.hasVariants && articleVariantId) {
        const warehouse = await this.salesPointsService.getDefaultWarehouse();
        const available =
          await this.salesPointsService.getVariantQuantityAtPoint(
            location.salesPointId,
            articleVariantId,
            warehouse?.id ?? null,
          );
        if (available < quantity) {
          throw new BadRequestException(
            `Stock insuficient de variant al punt per ${article.ownReference}. Disponible: ${available}`,
          );
        }
        return;
      }
      const stockAtPoint = await this.salesPointsService.getStockAtPoint(
        location.salesPointId,
        article.id,
      );
      if (stockAtPoint < quantity) {
        throw new BadRequestException(
          `Stock insuficiente en el punto de venta para el artículo ${article.ownReference}. Stock disponible: ${stockAtPoint}`,
        );
      }
      return;
    }

    if (article.hasVariants && articleVariantId) {
      const available = await this.fairsService.getVariantQuantityAtFair(
        location.fairId,
        articleVariantId,
      );
      if (available < quantity) {
        throw new BadRequestException(
          `Stock insuficient de variant a la fira per ${article.ownReference}. Disponible: ${available}`,
        );
      }
      return;
    }

    const stockAtFair = await this.fairsService.getStockAtFair(
      location.fairId,
      article.id,
    );
    if (stockAtFair < quantity) {
      throw new BadRequestException(
        `Stock insuficient a la fira per ${article.ownReference}. Disponible: ${stockAtFair}`,
      );
    }
  }

  private async deductStockForSale(
    location: ReturnType<typeof resolveSaleLocation>,
    article: Article,
    quantity: number,
    articleVariantId?: string,
  ): Promise<void> {
    if (location.kind === 'point') {
      await this.salesPointsService.deductStockForSale(
        location.salesPointId,
        article.id,
        quantity,
        article.hasVariants,
        articleVariantId,
      );
      return;
    }

    if (article.hasVariants && articleVariantId) {
      await this.fairsService.reduceFairVariant(
        location.fairId,
        articleVariantId,
        quantity,
        article.id,
      );
    } else {
      await this.fairsService.reduceFairStock(
        location.fairId,
        article.id,
        quantity,
      );
    }
  }

  private async restoreStockForSale(sale: Sale, item: SaleItem): Promise<void> {
    const article = await this.articleRepository.findOne({
      where: { id: item.articleId },
    });
    if (!article) {
      return;
    }

    if (sale.fairId) {
      if (article.hasVariants && item.articleVariantId) {
        await this.fairsService.restoreFairVariant(
          sale.fairId,
          item.articleVariantId,
          item.quantity,
          item.articleId,
        );
      } else {
        await this.fairsService.restoreFairStock(
          sale.fairId,
          item.articleId,
          item.quantity,
        );
      }
    } else if (sale.salesPointId) {
      await this.salesPointsService.restoreStockForSale(
        sale.salesPointId,
        item.articleId,
        item.quantity,
        article.hasVariants,
        item.articleVariantId,
      );
    }

    await this.salesPointsService.syncArticleStockTotal(item.articleId);
  }

  async findAll(): Promise<Sale[]> {
    return this.saleRepository.find({
      relations: ['salesPoint', 'fair', 'client', 'seller', 'items', 'items.article'],
      order: { saleDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id },
      relations: ['salesPoint', 'fair', 'client', 'seller', 'items', 'items.article'],
    });

    if (!sale) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada`);
    }

    return sale;
  }

  async search(searchDto: SearchSaleDto): Promise<Sale[]> {
    const queryBuilder = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.salesPoint', 'salesPoint')
      .leftJoinAndSelect('sale.fair', 'fair')
      .leftJoinAndSelect('sale.client', 'client')
      .leftJoinAndSelect('sale.seller', 'seller')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('items.article', 'article');

    if (searchDto.saleNumber) {
      queryBuilder.andWhere('sale.saleNumber LIKE :saleNumber', {
        saleNumber: `%${searchDto.saleNumber}%`,
      });
    }

    if (searchDto.ticketNumber) {
      queryBuilder.andWhere('sale.ticketNumber LIKE :ticketNumber', {
        ticketNumber: `%${searchDto.ticketNumber}%`,
      });
    }

    if (searchDto.clientName) {
      queryBuilder.andWhere(
        '(client.name LIKE :clientName OR client.surname LIKE :clientName)',
        { clientName: `%${searchDto.clientName}%` },
      );
    }

    if (searchDto.saleDateFrom && searchDto.saleDateTo) {
      queryBuilder.andWhere('sale.saleDate BETWEEN :from AND :to', {
        from: searchDto.saleDateFrom,
        to: searchDto.saleDateTo,
      });
    } else if (searchDto.saleDateFrom) {
      queryBuilder.andWhere('sale.saleDate >= :from', {
        from: searchDto.saleDateFrom,
      });
    } else if (searchDto.saleDateTo) {
      queryBuilder.andWhere('sale.saleDate <= :to', {
        to: searchDto.saleDateTo,
      });
    }

    if (searchDto.paymentType) {
      queryBuilder.andWhere('sale.paymentType = :paymentType', {
        paymentType: searchDto.paymentType,
      });
    }

    queryBuilder
      .orderBy('sale.saleDate', 'DESC')
      .addOrderBy('sale.createdAt', 'DESC');

    return queryBuilder.getMany();
  }

  async getDailySales(date?: string): Promise<Sale[]> {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.saleRepository.find({
      where: {
        saleDate: Between(startOfDay, endOfDay),
      },
      relations: ['salesPoint', 'fair', 'client', 'seller', 'items', 'items.article'],
      order: { saleTime: 'ASC', createdAt: 'ASC' },
    });
  }

  async update(id: string, updateSaleDto: UpdateSaleDto): Promise<Sale> {
    const sale = await this.findOne(id);

    if (updateSaleDto.clientId !== undefined) {
      if (updateSaleDto.clientId === null) {
        sale.client = null;
      } else {
        const client = await this.clientRepository.findOne({
          where: { id: updateSaleDto.clientId },
        });

        if (!client) {
          throw new NotFoundException(
            `Cliente con ID ${updateSaleDto.clientId} no encontrado`,
          );
        }

        sale.client = client;
      }
    }

    if (updateSaleDto.sellerId !== undefined) {
      if (updateSaleDto.sellerId === null) {
        sale.seller = null;
      } else {
        const seller = await this.userRepository.findOne({
          where: { id: updateSaleDto.sellerId },
        });

        if (!seller) {
          throw new NotFoundException(
            `Usuario con ID ${updateSaleDto.sellerId} no encontrado`,
          );
        }

        sale.seller = seller;
      }
    }

    Object.assign(sale, {
      saleDate: updateSaleDto.saleDate
        ? new Date(updateSaleDto.saleDate)
        : sale.saleDate,
      saleTime: updateSaleDto.saleTime ?? sale.saleTime,
      paymentType: updateSaleDto.paymentType ?? sale.paymentType,
      totalDiscount: updateSaleDto.totalDiscount ?? sale.totalDiscount,
      totalAmount: updateSaleDto.totalAmount ?? sale.totalAmount,
    });

    return this.saleRepository.save(sale);
  }

  async remove(id: string): Promise<void> {
    const sale = await this.findOne(id);

    for (const item of sale.items) {
      await this.restoreStockForSale(sale, item);
    }

    await this.saleRepository.remove(sale);
  }

  async generateSaleNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    const lastSale = await this.saleRepository.findOne({
      where: {
        saleNumber: Like(`V${year}${month}%`),
      },
      order: { saleNumber: 'DESC' },
    });

    let sequence = 1;
    if (lastSale) {
      const lastSequence = parseInt(lastSale.saleNumber.slice(-4), 10);
      sequence = lastSequence + 1;
    }

    return `V${year}${month}${String(sequence).padStart(4, '0')}`;
  }

  async generateTicketNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const lastSale = await this.saleRepository
      .createQueryBuilder('sale')
      .where('sale.ticketNumber LIKE :pattern', {
        pattern: `T${year}${month}${day}%`,
      })
      .andWhere('sale.saleDate BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .orderBy('sale.ticketNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastSale && lastSale.ticketNumber) {
      const lastSequence = parseInt(lastSale.ticketNumber.slice(-4), 10);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    return `T${year}${month}${day}${String(sequence).padStart(4, '0')}`;
  }
}
