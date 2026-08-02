import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Food)
    private readonly foodRepo: Repository<Food>,
  ) {}

  //convert order item to response dto
  private toItemResponseDto(item: OrderItem): OrderItemResponseDto {
    return {
      id: item.id,
      foodId: item.foodId,
      foodName: item.foodName,
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
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
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
    const isStaffOrAdmin =
      role === UserRole.ADMIN || role === UserRole.STAFF;
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

      return this.orderItemRepo.create({
        foodId: food.id,
        foodName: food.name,
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

    const saved = await this.orderRepo.save(order); //save to db
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
    order.status = dto.status;
    const updated = await this.orderRepo.save(order);
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
    return this.toResponseDto(updated);
  }

  //mask as paid
  //called by PaymentService Webhook only
  //Idempotent: if already paid, return as-is (stripe may retry webhooks)
  async markAsPaid(orderId: string): Promise<OrderResponseDto> {
    const order = await this.requireOrderWithItems(orderId);
    if (order.status === OrderStatus.PAID) {
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
    order.status = OrderStatus.PAID;
    const updated = await this.orderRepo.save(order);
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
      order: { createdAt: 'ASC' },
    });
    return orders.map((order) => this.toResponseDto(order));
  }
}
