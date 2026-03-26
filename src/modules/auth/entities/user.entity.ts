import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Fair } from '../../fairs/entities/fair.entity';

export enum UserRole {
  ADMIN = 'admin',
  BOTIGA = 'botiga',
}

@Entity('users')
@Index('idx_users_email', ['email'])
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.BOTIGA,
  })
  role: UserRole;

  @ManyToOne(() => Fair, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fair_id' })
  fair: Fair | null;

  @Column({ name: 'fair_id', nullable: true })
  fairId: string | null;
}

