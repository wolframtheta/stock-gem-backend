import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SalesPoint } from './sales-point.entity';
import { ArticleSize } from '../../articles/entities/article-size.entity';

@Entity('sales_point_size_stock')
@Unique(['salesPointId', 'articleSizeId'])
export class SalesPointSizeStock extends BaseEntity {
  @Column({ name: 'sales_point_id', type: 'uuid' })
  salesPointId: string;

  @ManyToOne(() => SalesPoint, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sales_point_id' })
  salesPoint: SalesPoint;

  @Column({ name: 'article_size_id', type: 'uuid' })
  articleSizeId: string;

  @ManyToOne(() => ArticleSize, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_size_id' })
  articleSize: ArticleSize;

  @Column({ type: 'int', default: 0 })
  quantity: number;
}
