import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Payment } from '../../payment/entities/payment.entity';
import { User } from '../../user/entities/user.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];

  /** Multiple payment attempts allowed (failed / expired / retry). */
  @OneToMany(() => Payment, (payment) => payment.order)
  payments!: Payment[];

  @Column({ name: 'total_items', type: 'int' })
  totalItems!: number;

  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  totalPrice!: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  /**
   * When the kitchen ETA clock hits this instant the card shows overdue.
   * Set on markAsPaid; display-only — status still changes via staff PATCH.
   */
  @Column({ name: 'estimated_ready_at', type: 'timestamptz', nullable: true })
  estimatedReadyAt!: Date | null;

  /** Set when Stripe confirms payment; used for kitchen board ordering/display. */
  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
