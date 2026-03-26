import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Albaran } from './albaran.entity';
import { Article } from '../../articles/entities/article.entity';

@Entity('albaran_items')
@Index('idx_albaran_items_albaran_id', ['albaran'])
@Index('idx_albaran_items_article_id', ['article'])
export class AlbaranItem extends BaseEntity {
  @ManyToOne(() => Albaran, (albaran) => albaran.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'albaran_id' })
  albaran: Albaran;

  @Column({ name: 'albaran_id' })
  albaranId: string;

  @ManyToOne(() => Article, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @Column({ name: 'article_id' })
  articleId: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'iva_type', type: 'varchar', length: 50, nullable: true })
  ivaType: string | null;

  @Column({ name: 'cost_price', type: 'decimal', precision: 10, scale: 2 })
  costPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  margin: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pvp: number;
}

