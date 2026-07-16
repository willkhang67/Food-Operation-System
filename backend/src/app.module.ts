import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoryModule } from './category/category.module';
import { CryptoModule } from './crypto/crypto.module';
import { FoodModule } from './food/food.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CryptoModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    UserModule,
    AuthModule,
    CategoryModule,
    FoodModule,
    OrderModule,
    PaymentModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // this is 60s yessir
        limit: 10, // max number of requests
      }
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
