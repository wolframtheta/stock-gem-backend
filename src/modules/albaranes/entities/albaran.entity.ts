import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { AlbaranItem } from './albaran-item.entity';

@Entity('albaranes')
@Index('idx_albaranes_albaran_number', ['albaranNumber'])
@Index('idx_albaranes_supplier_id', ['supplier'])
@Index('idx_albaranes_date', ['date'])
export class Albaran extends BaseEntity {
  @Column({ name: 'albaran_number', type: 'varchar', length: 50, unique: true })
  albaranNumber: string;

  @ManyToOne(() => Supplier, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ name: 'supplier_id' })
  supplierId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  condition: string | null; // 'condicional', 'definitivo', etc.

  @OneToMany(() => AlbaranItem, (item) => item.albaran, { cascade: true })
  items: AlbaranItem[];
}

