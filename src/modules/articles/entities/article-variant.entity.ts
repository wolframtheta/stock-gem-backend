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
import { ArticleVariantStock } from './article-variant-stock.entity';

@Entity('article_variants')
@Index('idx_article_variants_article_id', ['articleId'])
export class ArticleVariant extends BaseEntity {
  @Column({ name: 'article_id', type: 'uuid' })
  articleId: string;

  @ManyToOne(() => Article, (article) => article.variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @Column({ type: 'varchar', length: 50 })
  label: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @OneToOne(() => ArticleVariantStock, (stock) => stock.articleVariant)
  variantStock?: ArticleVariantStock;
}
