import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Food } from '../food/entities/food.entity';
import { UserRole } from '../user/enums/user-role.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItemResponseDto } from './dto/order-item-response.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';

const DEFAULT_PREP_MINUTES = 15;

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  /** Used only when an order has no usable cook_time snapshot (legacy). */
  private readonly fallbackPrepMinutes: number;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Food)
    private readonly foodRepo: Repository<Food>,
    config: ConfigService,
  ) {
    const raw = config.get<string>('KITCHEN_DEFAULT_PREP_MINUTES');
    const parsed = raw !== undefined ? Number(raw) : DEFAULT_PREP_MINUTES;
    this.fallbackPrepMinutes =
      Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_PREP_MINUTES;
  }

  //convert order item to response dto
  private toItemResponseDto(item: OrderItem): OrderItemResponseDto {
    return {
      id: item.id,
      foodId: item.foodId,
      foodName: item.foodName,
      cookTime: item.cookTime,
      unitPrice: Number(item.unitPrice),
      quantity: item.quantity,
      lineTotal: Number(item.lineTotal),
    };
  }

  //convert order to response dto
  private toResponseDto(order: Order): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalItems: order.totalItems,
      totalPrice: Number(order.totalPrice),
      items: (order.items ?? []).map((item) => this.toItemResponseDto(item)),
      estimatedReadyAt: order.estimatedReadyAt ?? null,
      paidAt: order.paidAt ?? null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * Per-order prep minutes = Σ (quantity × cookTime) from the line snapshot.
   * Orders are independent: two tickets paid at the same time share the same
   * clock origin (paidAt), not a kitchen queue offset.
   * Falls back to config only when the sum is empty/zero (legacy rows).
   */
  private prepMinutesForOrder(order: Order): number {
    const fromItems = (order.items ?? []).reduce((sum, item) => {
      const cookTime = Number.isFinite(item.cookTime)
        ? Math.max(0, Math.floor(item.cookTime))
        : 0;
      const quantity = Number.isFinite(item.quantity)
        ? Math.max(0, Math.floor(item.quantity))
        : 0;
      return sum + cookTime * quantity;
    }, 0);

    if (fromItems > 0) {
      return fromItems;
    }

    this.logger.warn(
      `Order prep minutes fell back to default orderId=${order.id} fallbackMinutes=${this.fallbackPrepMinutes}`,
    );
    return this.fallbackPrepMinutes;
  }

  private computeEstimatedReadyAt(order: Order, from: Date = new Date()): Date {
    return new Date(from.getTime() + this.prepMinutesForOrder(order) * 60_000);
  }

  /** Snap menu cook_time onto the line; refuse inventing a value for bad menu data. */
  private snapCookTime(food: Food): number {
    const raw = Number(food.cookTime);
    if (!Number.isFinite(raw) || raw < 1) {
      throw new BadRequestException(
        `Food "${food.name}" has invalid cook time; fix the menu before ordering`,
      );
    }
    return Math.floor(raw);
  }

  //find order with at least 1 food item
  private async requireOrderWithItems(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: { items: true },
    });
    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }
    return order;
  }

  //assert method to check if the user can access the order
  //this is for authen role
  private assertCanAccessOrder(
    order: Order,
    userId: string,
    role: UserRole,
  ): void {
    const isStaffOrAdmin = role === UserRole.ADMIN || role === UserRole.STAFF;
    if (!isStaffOrAdmin && order.userId !== userId) {
      throw new ForbiddenException('You can only access your own orders');
    }
  }

  //create order
  async create(userId: string, dto: CreateOrderDto): Promise<OrderResponseDto> {
    const foodIds = [...new Set(dto.items.map((item) => item.foodId))];
    const foods = await this.foodRepo.findBy({
      id: In(foodIds),
      status: 1,
      is_available: true,
    });

    const foodMap = new Map(foods.map((food) => [food.id, food]));
    const missingIds = foodIds.filter((id) => !foodMap.has(id));
    if (missingIds.length > 0) {
      throw new BadRequestException(
        `Food unavailable or not found: ${missingIds.join(', ')}`,
      );
    }

    const items = dto.items.map((line) => {
      const food = foodMap.get(line.foodId)!;
      const unitPrice = Number(food.price);
      const lineTotal = unitPrice * line.quantity;
      const cookTime = this.snapCookTime(food);

      return this.orderItemRepo.create({
        foodId: food.id,
        foodName: food.name,
        cookTime,
        unitPrice,
        quantity: line.quantity,
        lineTotal,
      });
    });

    //create order
    const order = this.orderRepo.create({
      userId,
      status: OrderStatus.PENDING,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0), //reduce to one value
      totalPrice: items.reduce((sum, item) => sum + Number(item.lineTotal), 0), //reduce to one value
      items,
    });

    const saved = await this.orderRepo.save(order);
    this.logger.log(
      `Order created orderId=${saved.id} userId=${userId} items=${saved.totalItems}`,
    );
    return this.toResponseDto(saved);
  }

  //find orders by user id
  async findMine(userId: string): Promise<OrderResponseDto[]> {
    const orders = await this.orderRepo.find({
      where: { userId },
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });
    return orders.map((order) => this.toResponseDto(order));
  }

  //find all orders
  async findAll(): Promise<OrderResponseDto[]> {
    const orders = await this.orderRepo.find({
      relations: { items: true },
      order: { createdAt: 'ASC' },
    });
    return orders.map((order) => this.toResponseDto(order));
  }

  //find one order by id
  async findOne(
    id: string,
    userId: string,
    role: UserRole,
  ): Promise<OrderResponseDto> {
    const order = await this.requireOrderWithItems(id);
    this.assertCanAccessOrder(order, userId, role);
    return this.toResponseDto(order);
  }

  //update order status
  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    const order = await this.requireOrderWithItems(id);
    const next = dto.status;

    // Staff must not manually set PAID, only Stripe webhook via markAsPaid
    if (next === OrderStatus.PAID) {
      throw new BadRequestException(
        'Paid status can only be set by payment confirmation',
      );
    }

    const allowed: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CANCELLED],
      // Kitchen MVP: Mark ready from paid in one tap; processing kept for later "started".
      [OrderStatus.PAID]: [
        OrderStatus.READY,
        OrderStatus.PROCESSING,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.PROCESSING]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!allowed[order.status]?.includes(next)) {
      throw new BadRequestException(
        `Invalid transition: ${order.status} to ${next}`,
      );
    }

    const previous = order.status;
    order.status = next;
    const updated = await this.orderRepo.save(order);
    this.logger.log(
      `Order status updated orderId=${id} from=${previous} to=${next}`,
    );
    return this.toResponseDto(updated);
  }

  //cancel order
  async cancel(
    id: string,
    userId: string,
    role: UserRole,
  ): Promise<OrderResponseDto> {
    const order = await this.requireOrderWithItems(id);
    this.assertCanAccessOrder(order, userId, role);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    order.status = OrderStatus.CANCELLED;
    const updated = await this.orderRepo.save(order);
    this.logger.log(`Order cancelled orderId=${id} userId=${userId}`);
    return this.toResponseDto(updated);
  }

  //mask as paid
  //called by PaymentService Webhook only
  //Idempotent: if already paid, return as-is (stripe may retry webhooks)
  async markAsPaid(orderId: string): Promise<OrderResponseDto> {
    const order = await this.requireOrderWithItems(orderId);
    if (order.status === OrderStatus.PAID) {
      // Legacy paid rows (or a race) may lack an ETA — backfill once so kitchen clocks work.
      let dirty = false;
      if (!order.estimatedReadyAt) {
        order.estimatedReadyAt = this.computeEstimatedReadyAt(order);
        dirty = true;
      }
      if (!order.paidAt) {
        order.paidAt = new Date();
        dirty = true;
      }
      if (dirty) {
        const patched = await this.orderRepo.save(order);
        this.logger.log(
          `Order paid fields backfilled orderId=${orderId} prepMinutes=${this.prepMinutesForOrder(order)} estimatedReadyAt=${patched.estimatedReadyAt?.toISOString()}`,
        );
        return this.toResponseDto(patched);
      }
      this.logger.debug(`markAsPaid idempotent skip orderId=${orderId}`);
      return this.toResponseDto(order);
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot mark a cancelled order as paid');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Cannot mark order as paid from status "${order.status}"`,
      );
    }
    const paidAt = new Date();
    const prepMinutes = this.prepMinutesForOrder(order);
    order.status = OrderStatus.PAID;
    order.paidAt = paidAt;
    order.estimatedReadyAt = this.computeEstimatedReadyAt(order, paidAt);
    const updated = await this.orderRepo.save(order);
    this.logger.log(
      `Order marked paid orderId=${orderId} prepMinutes=${prepMinutes} estimatedReadyAt=${updated.estimatedReadyAt?.toISOString()}`,
    );
    return this.toResponseDto(updated);
  }

  /**
   * Staff and kitchen: only paid or in-progress
   */
  async findKitchenQueue(): Promise<OrderResponseDto[]> {
    const orders = await this.orderRepo.find({
      where: {
        status: In([OrderStatus.PAID, OrderStatus.PROCESSING]),
      },
      relations: { items: true },
      // Oldest paid ticket first; createdAt breaks ties / legacy null paidAt.
      order: { paidAt: 'ASC', createdAt: 'ASC' },
    });
    return orders.map((order) => this.toResponseDto(order));
  }
}
