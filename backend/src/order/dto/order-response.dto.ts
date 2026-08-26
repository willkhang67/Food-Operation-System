import { OrderStatus } from '../enums/order-status.enum';
import { OrderItemResponseDto } from './order-item-response.dto';

export class OrderResponseDto {
  id!: string;
  userId!: string;
  status!: OrderStatus;
  totalItems!: number;
  totalPrice!: number;
  items!: OrderItemResponseDto[];
  /** ISO timestamp; null until the order is paid (or for legacy rows). */
  estimatedReadyAt!: Date | null;
  /** ISO timestamp of payment confirmation; null until paid. */
  paidAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}
