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
import { SalesPointsService } from '../sales-points/sales-points.service';

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
    private salesPointsService: SalesPointsService,
  ) {}

  async create(createSaleDto: CreateSaleDto): Promise<Sale> {
    // Generar número de venta automáticamente
    const saleNumber = await this.generateSaleNumber();
    
    // Generar número de ticket automáticamente
    const ticketNumber = await this.generateTicketNumber();

    // Verificar cliente si se proporciona
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

    // Verificar vendedor si se proporciona
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

    // Verificar punto de venta
    const salesPoint = await this.salesPointsService.findOne(
      createSaleDto.salesPointId,
    );

    // Verificar artículos y stock en el punto de venta
    for (const itemDto of createSaleDto.items) {
      const article = await this.articleRepository.findOne({
        where: { id: itemDto.articleId },
      });

      if (!article) {
        throw new NotFoundException(
          `Artículo con ID ${itemDto.articleId} no encontrado`,
        );
      }

      const stockAtPoint = await this.salesPointsService.getStockAtPoint(
        createSaleDto.salesPointId,
        itemDto.articleId,
      );

      if (stockAtPoint < itemDto.quantity) {
        throw new BadRequestException(
          `Stock insuficiente en el punto de venta para el artículo ${article.ownReference}. Stock disponible: ${stockAtPoint}`,
        );
      }
    }

    // Crear la venta
    const sale = this.saleRepository.create({
      salesPoint,
      saleNumber: saleNumber,
      ticketNumber: ticketNumber,
      client: client,
      seller: seller,
      saleDate: new Date(createSaleDto.saleDate),
      saleTime: createSaleDto.saleTime || null,
      paymentType: createSaleDto.paymentType,
      totalDiscount: createSaleDto.totalDiscount,
      totalAmount: createSaleDto.totalAmount,
    });

    const savedSale = await this.saleRepository.save(sale);

    // Crear los items y actualizar stock
    const items: SaleItem[] = [];
    for (const itemDto of createSaleDto.items) {
      const article = await this.articleRepository.findOne({
        where: { id: itemDto.articleId },
      });

      const saleItem = this.saleItemRepository.create({
        sale: savedSale,
        article: article!,
        quantity: itemDto.quantity,
        unitPrice: itemDto.unitPrice,
        discount: itemDto.discount,
        totalPrice: itemDto.totalPrice,
      });

      const savedItem = await this.saleItemRepository.save(saleItem);
      items.push(savedItem);

      // Reducir stock en punto de venta y total
      await this.salesPointsService.reduceStock(
        createSaleDto.salesPointId,
        itemDto.articleId,
        itemDto.quantity,
      );
      article!.stock -= itemDto.quantity;
      await this.articleRepository.save(article!);
    }

    // Cargar la venta con relaciones
    return this.saleRepository.findOne({
      where: { id: savedSale.id },
      relations: ['salesPoint', 'client', 'seller', 'items', 'items.article'],
    }) as Promise<Sale>;
  }

  async findAll(): Promise<Sale[]> {
    return this.saleRepository.find({
      relations: ['salesPoint', 'client', 'seller', 'items', 'items.article'],
      order: { saleDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Sale> {
    const sale = await this.saleRepository.findOne({
      where: { id },
      relations: ['salesPoint', 'client', 'seller', 'items', 'items.article'],
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

    queryBuilder.orderBy('sale.saleDate', 'DESC').addOrderBy('sale.createdAt', 'DESC');

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
      relations: ['salesPoint', 'client', 'seller', 'items', 'items.article'],
      order: { saleTime: 'ASC', createdAt: 'ASC' },
    });
  }

  async update(id: string, updateSaleDto: UpdateSaleDto): Promise<Sale> {
    const sale = await this.findOne(id);

    // No se permite actualizar saleNumber ni ticketNumber (son generados automáticamente)

    // Actualizar cliente si se proporciona
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

    // Actualizar vendedor si se proporciona
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

    // Actualizar otros campos (saleNumber y ticketNumber no se pueden actualizar)
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

    // Restaurar stock en punto de venta y total
    for (const item of sale.items) {
      await this.salesPointsService.restoreStock(
        sale.salesPointId,
        item.articleId,
        item.quantity,
      );
      const article = await this.articleRepository.findOne({
        where: { id: item.articleId },
      });
      if (article) {
        article.stock += item.quantity;
        await this.articleRepository.save(article);
      }
    }

    await this.saleRepository.remove(sale);
  }

  async generateSaleNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    // Buscar el último número de venta del mes
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

    // Buscar el último número de ticket del día
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

