import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Client } from '../../clients/entities/client.entity';
import { User } from '../../auth/entities/user.entity';
import { SalesPoint } from '../../sales-points/entities/sales-point.entity';
import { Fair } from '../../fairs/entities/fair.entity';
import { SaleItem } from './sale-item.entity';

export enum PaymentType {
  CASH = 'cash',
  CARD = 'card',
  TRANSFER = 'transfer',
  CASH_VOUCHER = 'cash_voucher',
  BIZUM = 'bizum',
}

@Entity('sales')
@Index('idx_sales_sale_number', ['saleNumber'])
@Index('idx_sales_client_id', ['client'])
@Index('idx_sales_seller_id', ['seller'])
@Index('idx_sales_sale_date', ['saleDate'])
@Index('idx_sales_sales_point_id', ['salesPoint'])
export class Sale extends BaseEntity {
  @ManyToOne(() => SalesPoint, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sales_point_id' })
  salesPoint: SalesPoint;

  @Column({ name: 'sales_point_id' })
  salesPointId: string;

  @ManyToOne(() => Fair, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fair_id' })
  fair: Fair | null;

  @Column({ name: 'fair_id', nullable: true })
  fairId: string | null;

  @Column({ name: 'sale_number', type: 'varchar', length: 50, unique: true })
  saleNumber: string;

  @Column({ name: 'ticket_number', type: 'varchar', length: 50, nullable: true })
  ticketNumber: string | null;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'client_id' })
  client: Client | null;

  @Column({ name: 'client_id', nullable: true })
  clientId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'seller_id' })
  seller: User | null;

  @Column({ name: 'seller_id', nullable: true })
  sellerId: string | null;

  @Column({ name: 'sale_date', type: 'date' })
  saleDate: Date;

  @Column({ name: 'sale_time', type: 'time', nullable: true })
  saleTime: string | null;

  @Column({
    name: 'payment_type',
    type: 'enum',
    enum: PaymentType,
    default: PaymentType.CASH,
  })
  paymentType: PaymentType;

  @Column({ name: 'total_discount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalDiscount: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items: SaleItem[];
}

