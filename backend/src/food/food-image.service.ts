import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FoodImage } from './entities/food-image.entity';
import { Food } from './entities/food.entity';

@Injectable()
export class FoodImageService {
  constructor(
    @InjectRepository(FoodImage)
    private readonly imageRepo: Repository<FoodImage>,
    @InjectRepository(Food)
    private readonly foodRepo: Repository<Food>,
  ) {}

  async addImage(foodId: string, url: string): Promise<FoodImage> {
    const food = await this.foodRepo.findOneBy({ id: foodId });
    if (!food) throw new NotFoundException(`Food with id ${foodId} not found`);

    const newImage = this.imageRepo.create({ url, foodId, nextImageId: null });
    const saved = await this.imageRepo.save(newImage);

    if (!food.headImageId) {
      food.headImageId = saved.id;
      await this.foodRepo.save(food);
    } else {
      let current = await this.imageRepo.findOneBy({ id: food.headImageId });
      while (current && current.nextImageId) {
        current = await this.imageRepo.findOneBy({ id: current.nextImageId });
      }
      if (current) {
        current.nextImageId = saved.id;
        await this.imageRepo.save(current);
      }
    }

    return saved;
  }

  async getImagesByFood(foodId: string): Promise<FoodImage[]> {
    const food = await this.foodRepo.findOneBy({ id: foodId });
    if (!food) throw new NotFoundException(`Food with id ${foodId} not found`);

    const result: FoodImage[] = [];
    let currentId = food.headImageId;

    while (currentId) {
      const node = await this.imageRepo.findOneBy({ id: currentId });
      if (!node) break;
      result.push(node);
      currentId = node.nextImageId;
    }

    return result;
  }

  async removeImage(foodId: string, imageId: string): Promise<void> {
    const food = await this.foodRepo.findOneBy({ id: foodId });
    if (!food) throw new NotFoundException(`Food with id ${foodId} not found`);

    const target = await this.imageRepo.findOneBy({ id: imageId });
    if (!target) throw new NotFoundException(`Image with id ${imageId} not found`);

    if (food.headImageId === imageId) {
      food.headImageId = target.nextImageId;
      await this.foodRepo.save(food);
    } else {
      let prev = await this.imageRepo.findOneBy({ id: food.headImageId! });
      while (prev && prev.nextImageId !== imageId) {
        prev = await this.imageRepo.findOneBy({ id: prev.nextImageId! });
      }
      if (prev) {
        prev.nextImageId = target.nextImageId;
        await this.imageRepo.save(prev);
      }
    }

    await this.imageRepo.delete(imageId);
  }
}