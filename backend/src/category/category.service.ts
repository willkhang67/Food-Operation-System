import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CategoryOptionDto } from './dto/category-option.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  private toResponseDto(category: Category): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      status: category.status,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  async create(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const existing = await this.categoryRepo.findOneBy({ name: dto.name });

    if (existing) {
      if (existing.status === 0) {
        existing.status = 1;
        existing.description = dto.description ?? existing.description;
        const reactivated = await this.categoryRepo.save(existing);
        return this.toResponseDto(reactivated);
      }

      throw new ConflictException(`Category with name "${dto.name}" already exists`);
    }

    const category = this.categoryRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      status: 1,
    });
    const saved = await this.categoryRepo.save(category);
    return this.toResponseDto(saved);
  }

  async findAll(includeInactive = false): Promise<CategoryResponseDto[]> {
    const categories = includeInactive
      ? await this.categoryRepo.find()
      : await this.categoryRepo.findBy({ status: 1 });

    return categories.map((c) => this.toResponseDto(c));
  }

  async getOptions(): Promise<CategoryOptionDto[]> {
    const categories = await this.categoryRepo.find({
      select: {
        id: true,
        name: true,
      },
      where: {
        status: 1,
      },
      order: {
        name: 'ASC',
      },
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
    }));
  }

  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepo.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return this.toResponseDto(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    const category = await this.categoryRepo.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    if (dto.name && dto.name !== category.name) {
      const existing = await this.categoryRepo.findOneBy({ name: dto.name });
      if (existing && existing.status === 1) {
        throw new ConflictException(`Category with name "${dto.name}" already exists`);
      }
    }

    Object.assign(category, dto);
    const updated = await this.categoryRepo.save(category);
    return this.toResponseDto(updated);
  }

  async softRemove(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepo.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    category.status = 0;
    const updated = await this.categoryRepo.save(category);
    return this.toResponseDto(updated);
  }

  async hardRemove(id: string): Promise<void> {
    const result = await this.categoryRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
  }
}