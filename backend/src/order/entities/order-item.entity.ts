import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'food_id', type: 'uuid' })
  foodId!: string;

  @Column({ name: 'food_name', type: 'varchar', length: 150 })
  foodName!: string;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  unitPrice!: number;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({
    name: 'line_total',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  lineTotal!: number;
}
