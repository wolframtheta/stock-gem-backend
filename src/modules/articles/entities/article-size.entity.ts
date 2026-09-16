import {
  Entity,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Article } from './article.entity';
import { ArticleSizeStock } from './article-size-stock.entity';

@Entity('article_sizes')
@Index('idx_article_sizes_article_id', ['articleId'])
export class ArticleSize extends BaseEntity {
  @Column({ name: 'article_id', type: 'uuid' })
  articleId: string;

  @ManyToOne(() => Article, (article) => article.sizes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @Column({ type: 'varchar', length: 50 })
  label: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @OneToOne(() => ArticleSizeStock, (stock) => stock.articleSize)
  sizeStock?: ArticleSizeStock;
}
