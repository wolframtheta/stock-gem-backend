import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('article_types')
@Index('idx_article_types_name', ['name'])
export class ArticleType extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;
}
