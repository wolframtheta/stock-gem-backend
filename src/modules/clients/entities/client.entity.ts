import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('clients')
@Index('idx_clients_mobile_phone', ['mobilePhone'])
@Index('idx_clients_landline_phone', ['landlinePhone'])
@Index('idx_clients_name', ['name'])
@Index('idx_clients_surname', ['surname'])
export class Client extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  surname: string;

  @Column({ name: 'mobile_phone', type: 'varchar', length: 20, nullable: true })
  mobilePhone: string | null;

  @Column({ name: 'landline_phone', type: 'varchar', length: 20, nullable: true })
  landlinePhone: string | null;
}

