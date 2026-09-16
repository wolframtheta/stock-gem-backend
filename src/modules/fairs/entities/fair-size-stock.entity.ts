import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Fair } from './fair.entity';
import { ArticleSize } from '../../articles/entities/article-size.entity';

@Entity('fair_size_stock')
@Unique(['fairId', 'articleSizeId'])
export class FairSizeStock extends BaseEntity {
  @Column({ name: 'fair_id', type: 'uuid' })
  fairId: string;

  @ManyToOne(() => Fair, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fair_id' })
  fair: Fair;

  @Column({ name: 'article_size_id', type: 'uuid' })
  articleSizeId: string;

  @ManyToOne(() => ArticleSize, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_size_id' })
  articleSize: ArticleSize;

  @Column({ type: 'int', default: 0 })
  quantity: number;
}
