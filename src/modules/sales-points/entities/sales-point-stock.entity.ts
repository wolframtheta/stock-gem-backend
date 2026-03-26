import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SalesPoint } from './sales-point.entity';
import { Article } from '../../articles/entities/article.entity';

@Entity('sales_point_stock')
@Unique(['salesPointId', 'articleId'])
@Index('idx_sales_point_stock_sales_point', ['salesPoint'])
@Index('idx_sales_point_stock_article', ['article'])
export class SalesPointStock extends BaseEntity {
  @ManyToOne(() => SalesPoint, (sp) => sp.stock, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sales_point_id' })
  salesPoint: SalesPoint;

  @Column({ name: 'sales_point_id' })
  salesPointId: string;

  @ManyToOne(() => Article, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @Column({ name: 'article_id' })
  articleId: string;

  @Column({ type: 'int', default: 0 })
  quantity: number;
}
