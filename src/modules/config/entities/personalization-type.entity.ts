import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('personalization_types')
@Index('idx_personalization_types_name', ['name'])
export class PersonalizationType extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;
}
