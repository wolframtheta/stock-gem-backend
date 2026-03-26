import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('collections')
@Index('idx_collections_name', ['name'])
export class Collection extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;
}
