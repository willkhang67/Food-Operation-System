import { OrderStatus } from '../enums/order-status.enum';
import { OrderItemResponseDto } from './order-item-response.dto';

export class OrderResponseDto {
  id!: string;
  userId!: string;
  status!: OrderStatus;
  totalItems!: number;
  totalPrice!: number;
  items!: OrderItemResponseDto[];
  createdAt!: Date;
  updatedAt!: Date;
}
