import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Article } from './article.entity';

@Entity('article_stock_history')
@Index('idx_article_stock_history_article', ['article'])
@Index('idx_article_stock_history_recorded_at', ['recordedAt'])
export class ArticleStockHistory extends BaseEntity {
  @ManyToOne(() => Article, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @Column({ name: 'article_id' })
  articleId: string;

  @Column({ name: 'quantity_added', type: 'int' })
  quantityAdded: number;

  @Column({ name: 'recorded_at', type: 'date' })
  recordedAt: Date;
}
