import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Food } from './entities/food.entity';
import { Category } from '../category/entities/category.entity';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';
import { UpdateFoodPriceDto } from './dto/update-food-price.dto';
import { FoodResponseDto } from './dto/food-response.dto';

@Injectable()
export class FoodService {
  constructor(
    @InjectRepository(Food)
    private readonly foodRepo: Repository<Food>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  private toResponseDto(food: Food): FoodResponseDto {
    return {
      id: food.id,
      name: food.name,
      price: Number(food.price),
      description: food.description,
      is_available: food.is_available,
      status: food.status,
      categories: (food.categories ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        status: c.status,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),

      images: (food.images ?? []).map((image) => ({
        id: image.id,
        url: image.url,
      })),

      createdAt: food.createdAt,
      updatedAt: food.updatedAt,
    };
  }

  private async resolveCategories(categoryIds: string[]): Promise<Category[]> {
    const categories = await this.categoryRepo.findBy({ id: In(categoryIds) });
    if (categories.length !== categoryIds.length) {
      throw new NotFoundException('Một hoặc nhiều category không tồn tại');
    }
    return categories;
  }

  private async findActiveByName(name: string): Promise<Food | null> {
    return this.foodRepo.findOneBy({ name, status: 1 });
  }

  async create(dto: CreateFoodDto): Promise<FoodResponseDto> {
    const existing = await this.findActiveByName(dto.name);
    if (existing) {
      throw new ConflictException(
        `Food with name "${dto.name}" already exists`,
      );
    }

    const categories = await this.resolveCategories(dto.categoryIds);

    const food = this.foodRepo.create({
      name: dto.name,
      price: dto.price,
      description: dto.description ?? null,
      is_available: dto.is_available ?? true,
      status: 1,
      categories,
    });

    const saved = await this.foodRepo.save(food);
    return this.toResponseDto(saved);
  }

  async findAll(includeInactive = false): Promise<FoodResponseDto[]> {
    const foods = await this.foodRepo.find({
      where: includeInactive ? {} : { status: 1 },
      relations: {
        categories: true,
        images: true,
      },
    });
    return foods.map((f) => this.toResponseDto(f));
  }

  async findOne(id: string): Promise<FoodResponseDto> {
    const food = await this.foodRepo.findOne({
      where: { id },
      relations: { categories: true },
    });
    if (!food) throw new NotFoundException(`Food with id ${id} not found`);
    return this.toResponseDto(food);
  }

  // Xem lịch sử giá - tra theo name của food
  async getPriceHistory(id: string): Promise<FoodResponseDto[]> {
    const food = await this.foodRepo.findOneBy({ id });
    if (!food) throw new NotFoundException(`Food with id ${id} not found`);

    const history = await this.foodRepo.find({
      where: { name: food.name },
      relations: { categories: true },
      order: { createdAt: 'ASC' },
    });

    return history.map((f) => this.toResponseDto(f));
  }

  // cập nhật chỉ description
  async update(id: string, dto: UpdateFoodDto): Promise<FoodResponseDto> {
    const food = await this.foodRepo.findOne({
      where: { id, status: 1 },
      relations: { categories: true },
    });
    if (!food)
      throw new NotFoundException(`Active food with id ${id} not found`);

    if (dto.description !== undefined) {
      food.description = dto.description;
    }

    const updated = await this.foodRepo.save(food);
    return this.toResponseDto(updated);
  }

  // caapj nhật giá mới, tạo record mới, record giá cũ có status = 0
  async updatePrice(
    id: string,
    dto: UpdateFoodPriceDto,
  ): Promise<FoodResponseDto> {
    const current = await this.foodRepo.findOne({
      where: { id, status: 1 },
      relations: { categories: true },
    });
    if (!current)
      throw new NotFoundException(`Active food with id ${id} not found`);

    current.status = 0;
    await this.foodRepo.save(current);

    const newVersion = this.foodRepo.create({
      name: current.name,
      description: current.description,
      is_available: current.is_available,
      price: dto.price,
      status: 1,
      categories: current.categories,
    });

    const saved = await this.foodRepo.save(newVersion);
    return this.toResponseDto(saved);
  }

  async softRemove(id: string): Promise<FoodResponseDto> {
    const food = await this.foodRepo.findOne({
      where: { id },
      relations: { categories: true },
    });
    if (!food) throw new NotFoundException(`Food with id ${id} not found`);

    food.status = 0;
    const updated = await this.foodRepo.save(food);
    return this.toResponseDto(updated);
  }

  async hardRemove(id: string): Promise<void> {
    const result = await this.foodRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Food with id ${id} not found`);
    }
  }
}
