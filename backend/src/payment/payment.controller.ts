import { Controller } from '@nestjs/common';
import { PaymentService } from './payment.service';

/**
 * Scaffold routes removed. Implement in Step 7:
 * - POST /payment/checkout/:orderId
 * - POST /payment/webhook
 * - GET  /payment/order/:orderId (optional)
 */
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}
}
