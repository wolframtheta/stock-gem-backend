import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Article } from './article.entity';

@Entity('article_price_history')
@Index('idx_article_price_history_article', ['article'])
@Index('idx_article_price_history_changed_at', ['changedAt'])
export class ArticlePriceHistory extends BaseEntity {
  @ManyToOne(() => Article, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @Column({ name: 'article_id' })
  articleId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'changed_at', type: 'date' })
  changedAt: Date;
}
