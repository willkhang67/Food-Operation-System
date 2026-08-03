import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from '../order/entities/order.entity';
import { OrderService } from '../order/order.service';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';
import { STRIPE_CLIENT } from './stripe/stripe.provider';

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: STRIPE_CLIENT,
          useValue: {
            checkout: { sessions: { create: jest.fn() } },
            webhooks: { constructEvent: jest.fn() },
          },
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOneBy: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
          },
        },
        {
          provide: OrderService,
          useValue: { markAsPaid: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (_key: string, defaultValue?: string) => defaultValue,
            ),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
