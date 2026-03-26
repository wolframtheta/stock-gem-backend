import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('workshops')
@Index('idx_workshops_name', ['name'])
@Index('idx_workshops_phone', ['phone'])
export class Workshop extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;
}

