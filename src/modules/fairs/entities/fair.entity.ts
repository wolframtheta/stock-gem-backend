import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { FairStock } from './fair-stock.entity';

@Entity('fairs')
@Index('idx_fairs_name', ['name'])
@Index('idx_fairs_start_date', ['startDate'])
@Index('idx_fairs_end_date', ['endDate'])
export class Fair extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @OneToMany(() => FairStock, (fs) => fs.fair)
  stock: FairStock[];
}
