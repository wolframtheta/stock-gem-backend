import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Client } from '../../clients/entities/client.entity';
import { Workshop } from '../../workshops/entities/workshop.entity';
import { ComposturaType } from '../../config/entities/compostura-type.entity';

@Entity('composturas')
@Index('idx_composturas_code', ['code'])
@Index('idx_composturas_client_id', ['client'])
@Index('idx_composturas_workshop_id', ['workshop'])
@Index('idx_composturas_entry_date', ['entryDate'])
export class Compostura extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @ManyToOne(() => Client, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Workshop, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'workshop_id' })
  workshop: Workshop | null;

  @ManyToOne(() => ComposturaType, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'compostura_type_id' })
  composturaType: ComposturaType | null;

  @Column({ name: 'compostura_type_id', nullable: true })
  composturaTypeId: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'work_to_do', type: 'text', nullable: true })
  workToDo: string | null;

  @Column({ name: 'entry_date', type: 'date' })
  entryDate: Date;

  @Column({
    name: 'delivery_to_workshop_date',
    type: 'date',
    nullable: true,
  })
  deliveryToWorkshopDate: Date | null;

  @Column({
    name: 'exit_from_workshop_date',
    type: 'date',
    nullable: true,
  })
  exitFromWorkshopDate: Date | null;

  @Column({
    name: 'delivery_to_client_date',
    type: 'date',
    nullable: true,
  })
  deliveryToClientDate: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  pvp: number;

  @Column({
    name: 'payment_on_account',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  paymentOnAccount: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  photo: string | null;
}

