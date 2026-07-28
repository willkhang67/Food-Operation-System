import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../order/entities/order.entity';
import { User } from '../../user/entities/user.entity';
import { PaymentStatus } from '../enums/payment-status.enum';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Not unique: one order may have many attempts (failed / expired / retry). */
  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.payments)
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 32, default: 'stripe' })
  provider!: string;

  @Column({
    name: 'stripe_checkout_session_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  stripeCheckoutSessionId!: string | null;

  @Column({
    name: 'stripe_payment_intent_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  stripePaymentIntentId!: string | null;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  /** Snapshot from order.totalPrice at checkout time — never from the client. */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'varchar', length: 3, default: 'aud' })
  currency!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
