import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Fair } from './fair.entity';
import { Article } from '../../articles/entities/article.entity';

@Entity('fair_stock')
@Unique(['fairId', 'articleId'])
@Index('idx_fair_stock_fair', ['fair'])
@Index('idx_fair_stock_article', ['article'])
export class FairStock extends BaseEntity {
  @ManyToOne(() => Fair, (f) => f.stock, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fair_id' })
  fair: Fair;

  @Column({ name: 'fair_id' })
  fairId: string;

  @ManyToOne(() => Article, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @Column({ name: 'article_id' })
  articleId: string;

  @Column({ type: 'int', default: 0 })
  quantity: number;
}
