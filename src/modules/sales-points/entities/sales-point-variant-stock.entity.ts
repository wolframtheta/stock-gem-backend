import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SalesPoint } from './sales-point.entity';
import { ArticleVariant } from '../../articles/entities/article-variant.entity';

@Entity('sales_point_variant_stock')
@Unique(['salesPointId', 'articleVariantId'])
export class SalesPointVariantStock extends BaseEntity {
  @Column({ name: 'sales_point_id', type: 'uuid' })
  salesPointId: string;

  @ManyToOne(() => SalesPoint, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sales_point_id' })
  salesPoint: SalesPoint;

  @Column({ name: 'article_variant_id', type: 'uuid' })
  articleVariantId: string;

  @ManyToOne(() => ArticleVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_variant_id' })
  articleVariant: ArticleVariant;

  @Column({ type: 'int', default: 0 })
  quantity: number;
}
