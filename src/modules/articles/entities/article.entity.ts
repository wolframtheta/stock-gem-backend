import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { Collection } from '../../config/entities/collection.entity';
import { ArticleType } from '../../config/entities/article-type.entity';

@Entity('articles')
@Index('idx_articles_own_reference', ['ownReference'])
@Index('idx_articles_supplier_reference', ['supplierReference'])
@Index('idx_articles_supplier_id', ['supplier'])
@Index('idx_articles_barcode', ['barcode'])
export class Article extends BaseEntity {
  @Column({ name: 'own_reference', type: 'varchar', length: 100, unique: true })
  ownReference: string;

  @Column({ name: 'supplier_reference', type: 'varchar', length: 100, nullable: true })
  supplierReference: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  family: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subfamily: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'short_description', type: 'varchar', length: 255, nullable: true })
  shortDescription: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  pvp: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  weight: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  margin: number | null;

  @Column({ name: 'tax_base', type: 'decimal', precision: 10, scale: 2, nullable: true })
  taxBase: number | null;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  photo: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  barcode: string | null;

  @ManyToOne(() => Supplier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier | null;

  @Column({ name: 'supplier_id', nullable: true })
  supplierId: string | null;

  @ManyToOne(() => Collection, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'collection_id' })
  collection: Collection | null;

  @Column({ name: 'collection_id', nullable: true })
  collectionId: string | null;

  @ManyToOne(() => ArticleType, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'article_type_id' })
  articleType: ArticleType | null;

  @Column({ name: 'article_type_id', nullable: true })
  articleTypeId: string | null;
}

