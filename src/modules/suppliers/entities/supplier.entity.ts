import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('suppliers')
@Index('idx_suppliers_nif', ['nif'])
export class Supplier extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  surname: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  nif: string;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'text', nullable: true })
  phones: string | null; // JSON string o array serializado

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;
}

