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

import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ProxyAwareThrottlerGuard } from './common/guards/proxy-aware-throttler.guard';

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
    /**
     * One global bucket only. Named definitions registered here are additive,
     * not opt-in: a second 'auth' definition with limit 5 applied to *every*
     * route, capping the whole API at 5 requests a minute, and @SkipThrottle()
     * did not save the public controllers because with no argument it skips
     * only the definition literally named 'default'.
     *
     * The strict auth limit is therefore declared per route with @Throttle.
     */
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000, // 60s window
        limit: 300,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      // Buckets by the visitor's IP, not the BFF's. See the guard for why this
      // cannot simply trust x-forwarded-for.
      useClass: ProxyAwareThrottlerGuard,
    },
  ],
})
export class AppModule {}
