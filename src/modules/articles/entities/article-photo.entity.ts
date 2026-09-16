import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Article } from './article.entity';

@Entity('article_photos')
@Index('idx_article_photos_article_id', ['articleId'])
export class ArticlePhoto extends BaseEntity {
  @Column({ name: 'article_id', type: 'uuid' })
  articleId: string;

  @ManyToOne(() => Article, (article) => article.photos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @Column({ type: 'varchar', length: 500 })
  path: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
