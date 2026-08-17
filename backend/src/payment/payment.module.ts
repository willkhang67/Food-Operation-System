import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderModule } from './../order/order.module';
import { Order } from './../order/entities/order.entity';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { StripeProvider } from './stripe/stripe.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Order]), OrderModule],
  controllers: [PaymentController],
  providers: [PaymentService, StripeProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
