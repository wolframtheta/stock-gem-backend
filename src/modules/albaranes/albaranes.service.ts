import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { Albaran } from './entities/albaran.entity';
import { AlbaranItem } from './entities/albaran-item.entity';
import { CreateAlbaranDto } from './dto/create-albaran.dto';
import { UpdateAlbaranDto } from './dto/update-albaran.dto';
import { SearchAlbaranDto } from './dto/search-albaran.dto';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Article } from '../articles/entities/article.entity';

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
  ) {}

  async create(createAlbaranDto: CreateAlbaranDto): Promise<Albaran> {
    // Verificar que el número de albarán no existe
    const existingAlbaran = await this.albaranRepository.findOne({
      where: { albaranNumber: createAlbaranDto.albaranNumber },
    });

    if (existingAlbaran) {
      throw new ConflictException(
        `Ya existe un albarán con el número ${createAlbaranDto.albaranNumber}`,
      );
    }

    // Verificar proveedor
    const supplier = await this.supplierRepository.findOne({
      where: { id: createAlbaranDto.supplierId },
    });

    if (!supplier) {
      throw new NotFoundException(
        `Proveedor con ID ${createAlbaranDto.supplierId} no encontrado`,
      );
    }

    // Verificar artículos
    for (const itemDto of createAlbaranDto.items) {
      const article = await this.articleRepository.findOne({
        where: { id: itemDto.articleId },
      });

      if (!article) {
        throw new NotFoundException(
          `Artículo con ID ${itemDto.articleId} no encontrado`,
        );
      }
    }

    // Crear el albarán
    const albaran = this.albaranRepository.create({
      albaranNumber: createAlbaranDto.albaranNumber,
      supplier: supplier,
      date: new Date(createAlbaranDto.date),
      condition: createAlbaranDto.condition || null,
    });

    const savedAlbaran = await this.albaranRepository.save(albaran);

    // Crear los items y actualizar stock
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

      // Aumentar stock
      article!.stock += itemDto.quantity;
      await this.articleRepository.save(article!);
    }

    // Cargar el albarán con relaciones
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

  async update(id: string, updateAlbaranDto: UpdateAlbaranDto): Promise<Albaran> {
    const albaran = await this.findOne(id);

    // Verificar número único si se actualiza
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

    // Actualizar proveedor si se proporciona
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

    // Actualizar otros campos
    Object.assign(albaran, {
      albaranNumber: updateAlbaranDto.albaranNumber ?? albaran.albaranNumber,
      date: updateAlbaranDto.date
        ? new Date(updateAlbaranDto.date)
        : albaran.date,
      condition: updateAlbaranDto.condition ?? albaran.condition,
    });

    // Si se proporcionan items, actualizarlos
    if (updateAlbaranDto.items) {
      // Eliminar items existentes y restaurar stock
      for (const existingItem of albaran.items) {
        const article = await this.articleRepository.findOne({
          where: { id: existingItem.articleId },
        });

        if (article) {
          article.stock -= existingItem.quantity;
          await this.articleRepository.save(article);
        }

        await this.albaranItemRepository.remove(existingItem);
      }

      // Crear nuevos items y actualizar stock
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

        // Aumentar stock
        article.stock += itemDto.quantity;
        await this.articleRepository.save(article);
      }

      albaran.items = items;
    }

    return this.albaranRepository.save(albaran);
  }

  async remove(id: string): Promise<void> {
    const albaran = await this.findOne(id);

    // Restaurar stock de los artículos
    for (const item of albaran.items) {
      const article = await this.articleRepository.findOne({
        where: { id: item.articleId },
      });

      if (article) {
        article.stock -= item.quantity;
        await this.articleRepository.save(article);
      }
    }

    await this.albaranRepository.remove(albaran);
  }
}

