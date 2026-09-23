import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Fair } from './fair.entity';
import { ArticleVariant } from '../../articles/entities/article-variant.entity';

@Entity('fair_variant_stock')
@Unique(['fairId', 'articleVariantId'])
export class FairVariantStock extends BaseEntity {
  @Column({ name: 'fair_id', type: 'uuid' })
  fairId: string;

  @ManyToOne(() => Fair, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fair_id' })
  fair: Fair;

  @Column({ name: 'article_variant_id', type: 'uuid' })
  articleVariantId: string;

  @ManyToOne(() => ArticleVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_variant_id' })
  articleVariant: ArticleVariant;

  @Column({ type: 'int', default: 0 })
  quantity: number;
}
