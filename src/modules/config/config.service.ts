import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from './entities/collection.entity';
import { ArticleType } from './entities/article-type.entity';
import { PersonalizationType } from './entities/personalization-type.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { CreateArticleTypeDto } from './dto/create-article-type.dto';
import { UpdateArticleTypeDto } from './dto/update-article-type.dto';
import { CreatePersonalizationTypeDto } from './dto/create-personalization-type.dto';
import { UpdatePersonalizationTypeDto } from './dto/update-personalization-type.dto';

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>,
    @InjectRepository(ArticleType)
    private articleTypeRepository: Repository<ArticleType>,
    @InjectRepository(PersonalizationType)
    private personalizationTypeRepository: Repository<PersonalizationType>,
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

  async updateCollection(
    id: string,
    dto: UpdateCollectionDto,
  ): Promise<Collection> {
    const c = await this.findOneCollection(id);
    Object.assign(c, dto);
    return this.collectionRepository.save(c);
  }

  async removeCollection(id: string): Promise<void> {
    throw new ForbiddenException('No es pot eliminar una col·lecció');
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
    throw new ForbiddenException('No es pot eliminar un tipus de peça');
  }

  // Personalization types
  async findAllPersonalizationTypes(): Promise<PersonalizationType[]> {
    return this.personalizationTypeRepository.find({ order: { name: 'ASC' } });
  }

  async findOnePersonalizationType(id: string): Promise<PersonalizationType> {
    const t = await this.personalizationTypeRepository.findOne({
      where: { id },
    });
    if (!t) throw new NotFoundException(`Tipus de personalització no trobat`);
    return t;
  }

  async createPersonalizationType(
    dto: CreatePersonalizationTypeDto,
  ): Promise<PersonalizationType> {
    const t = this.personalizationTypeRepository.create(dto);
    return this.personalizationTypeRepository.save(t);
  }

  async updatePersonalizationType(
    id: string,
    dto: UpdatePersonalizationTypeDto,
  ): Promise<PersonalizationType> {
    const t = await this.findOnePersonalizationType(id);
    Object.assign(t, dto);
    return this.personalizationTypeRepository.save(t);
  }

  async removePersonalizationType(id: string): Promise<void> {
    const t = await this.findOnePersonalizationType(id);
    await this.personalizationTypeRepository.remove(t);
  }
}
