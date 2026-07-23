import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FoodImageService } from './food-image.service';
import { FoodService } from './food.service';
import { FoodController } from './food.controller';

import { Food } from './entities/food.entity';
import { Category } from '../category/entities/category.entity';
import { FoodImage } from './entities/food-image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Food, Category, FoodImage])],
  controllers: [FoodController],
  providers: [FoodService, FoodImageService],
  exports: [TypeOrmModule],
})
export class FoodModule {}
