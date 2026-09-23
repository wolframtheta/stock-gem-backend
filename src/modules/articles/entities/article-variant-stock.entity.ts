import { Entity, Column, OneToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { ArticleVariant } from './article-variant.entity';

@Entity('article_variant_stock')
export class ArticleVariantStock {
  @PrimaryColumn({ name: 'article_variant_id', type: 'uuid' })
  articleVariantId: string;

  @OneToOne(() => ArticleVariant, (variant) => variant.variantStock, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'article_variant_id' })
  articleVariant: ArticleVariant;

  @Column({ type: 'int', default: 0 })
  quantity: number;
}
