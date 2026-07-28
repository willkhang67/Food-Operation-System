import { PaymentStatus } from '../enums/payment-status.enum';

export class PaymentResponseDto {
  id!: string;
  orderId!: string;
  status!: PaymentStatus;
  amount!: number;
  currency!: string;
  provider!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
