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

  /**
   * Minutes to cook one unit, snapped from food.cook_time at order create so
   * payment ETA does not drift if the menu cook_time changes later.
   * DB default is only for schema rollout on legacy rows; create() always sets
   * an explicit value from the menu.
   */
  @Column({ name: 'cook_time', type: 'int', default: 1 })
  cookTime!: number;

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
