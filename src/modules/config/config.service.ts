import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from './entities/collection.entity';
import { ArticleType } from './entities/article-type.entity';
import { ComposturaType } from './entities/compostura-type.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { CreateArticleTypeDto } from './dto/create-article-type.dto';
import { UpdateArticleTypeDto } from './dto/update-article-type.dto';
import { CreateComposturaTypeDto } from './dto/create-compostura-type.dto';
import { UpdateComposturaTypeDto } from './dto/update-compostura-type.dto';

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>,
    @InjectRepository(ArticleType)
    private articleTypeRepository: Repository<ArticleType>,
    @InjectRepository(ComposturaType)
    private composturaTypeRepository: Repository<ComposturaType>,
  ) {}

  // Collections
  async findAllCollections(): Promise<Collection[]> {
    return this.collectionRepository.find({ order: { name: 'ASC' } });
  }

  async findOneCollection(id: string): Promise<Collection> {
    const c = await this.collectionRepository.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Col·lecció no trobada`);
    return c;
  }

  async createCollection(dto: CreateCollectionDto): Promise<Collection> {
    const c = this.collectionRepository.create(dto);
    return this.collectionRepository.save(c);
  }

  async updateCollection(id: string, dto: UpdateCollectionDto): Promise<Collection> {
    const c = await this.findOneCollection(id);
    Object.assign(c, dto);
    return this.collectionRepository.save(c);
  }

  async removeCollection(id: string): Promise<void> {
    const c = await this.findOneCollection(id);
    await this.collectionRepository.remove(c);
  }

  // Article types
  async findAllArticleTypes(): Promise<ArticleType[]> {
    return this.articleTypeRepository.find({ order: { name: 'ASC' } });
  }

  async findOneArticleType(id: string): Promise<ArticleType> {
    const t = await this.articleTypeRepository.findOne({ where: { id } });
    if (!t) throw new NotFoundException(`Tipus d'article no trobat`);
    return t;
  }

  async createArticleType(dto: CreateArticleTypeDto): Promise<ArticleType> {
    const t = this.articleTypeRepository.create(dto);
    return this.articleTypeRepository.save(t);
  }

  async updateArticleType(
    id: string,
    dto: UpdateArticleTypeDto,
  ): Promise<ArticleType> {
    const t = await this.findOneArticleType(id);
    Object.assign(t, dto);
    return this.articleTypeRepository.save(t);
  }

  async removeArticleType(id: string): Promise<void> {
    const t = await this.findOneArticleType(id);
    await this.articleTypeRepository.remove(t);
  }

  // Compostura types
  async findAllComposturaTypes(): Promise<ComposturaType[]> {
    return this.composturaTypeRepository.find({ order: { name: 'ASC' } });
  }

  async findOneComposturaType(id: string): Promise<ComposturaType> {
    const t = await this.composturaTypeRepository.findOne({ where: { id } });
    if (!t) throw new NotFoundException(`Tipus de compostura no trobat`);
    return t;
  }

  async createComposturaType(
    dto: CreateComposturaTypeDto,
  ): Promise<ComposturaType> {
    const t = this.composturaTypeRepository.create(dto);
    return this.composturaTypeRepository.save(t);
  }

  async updateComposturaType(
    id: string,
    dto: UpdateComposturaTypeDto,
  ): Promise<ComposturaType> {
    const t = await this.findOneComposturaType(id);
    Object.assign(t, dto);
    return this.composturaTypeRepository.save(t);
  }

  async removeComposturaType(id: string): Promise<void> {
    const t = await this.findOneComposturaType(id);
    await this.composturaTypeRepository.remove(t);
  }
}
