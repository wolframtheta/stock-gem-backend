import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Sale } from './sale.entity';
import { Article } from '../../articles/entities/article.entity';
import { ArticleVariant } from '../../articles/entities/article-variant.entity';

@Entity('sale_items')
@Index('idx_sale_items_sale_id', ['sale'])
@Index('idx_sale_items_article_id', ['article'])
export class SaleItem extends BaseEntity {
  @ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @Column({ name: 'sale_id' })
  saleId: string;

  @ManyToOne(() => Article, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @Column({ name: 'article_id' })
  articleId: string;

  @ManyToOne(() => ArticleVariant, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'article_variant_id' })
  articleVariant: ArticleVariant | null;

  @Column({ name: 'article_variant_id', nullable: true })
  articleVariantId: string | null;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;
}
