import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Collection } from '../../config/entities/collection.entity';
import { ArticleType } from '../../config/entities/article-type.entity';
import { ArticlePhoto } from './article-photo.entity';

@Entity('articles')
@Index('idx_articles_own_reference', ['ownReference'])
export class Article extends BaseEntity {
  @Column({ name: 'own_reference', type: 'varchar', length: 100, unique: true })
  ownReference: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  pvp: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  photo: string | null;

  @ManyToOne(() => Collection, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'collection_id' })
  collection: Collection | null;

  @Column({ name: 'collection_id', nullable: true })
  collectionId: string | null;

  @ManyToOne(() => ArticleType, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'article_type_id' })
  articleType: ArticleType | null;

  @Column({ name: 'article_type_id', nullable: true })
  articleTypeId: string | null;

  @OneToMany(() => ArticlePhoto, (photo) => photo.article)
  photos: ArticlePhoto[];
}
