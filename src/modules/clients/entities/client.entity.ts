import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('clients')
@Index('idx_clients_mobile_phone', ['mobilePhone'])
@Index('idx_clients_email', ['email'])
@Index('idx_clients_name', ['name'])
@Index('idx_clients_surname', ['surname'])
export class Client extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  surname: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'mobile_phone', type: 'varchar', length: 20, nullable: true })
  mobilePhone: string | null;

  @Column({ type: 'text', nullable: true })
  observations: string | null;
}
