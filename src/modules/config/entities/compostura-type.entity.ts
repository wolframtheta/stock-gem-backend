import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('compostura_types')
@Index('idx_compostura_types_name', ['name'])
export class ComposturaType extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;
}
