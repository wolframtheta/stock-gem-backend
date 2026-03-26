import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SalesPointStock } from './sales-point-stock.entity';

@Entity('sales_points')
@Index('idx_sales_points_code', ['code'])
@Index('idx_sales_points_name', ['name'])
export class SalesPoint extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'is_default_warehouse', type: 'boolean', default: false })
  isDefaultWarehouse: boolean;

  @OneToMany(() => SalesPointStock, (sp) => sp.salesPoint)
  stock: SalesPointStock[];
}
