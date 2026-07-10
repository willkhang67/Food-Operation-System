import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { CategoryModule } from './category/category.module';
import { FoodModule } from './food/food.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [UserModule, CategoryModule, FoodModule, OrderModule, PaymentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
