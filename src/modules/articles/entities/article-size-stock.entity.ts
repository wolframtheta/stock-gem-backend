import { Entity, Column, OneToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { ArticleSize } from './article-size.entity';

@Entity('article_size_stock')
export class ArticleSizeStock {
  @PrimaryColumn({ name: 'article_size_id', type: 'uuid' })
  articleSizeId: string;

  @OneToOne(() => ArticleSize, (size) => size.sizeStock, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'article_size_id' })
  articleSize: ArticleSize;

  @Column({ type: 'int', default: 0 })
  quantity: number;
}
