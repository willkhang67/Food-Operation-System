import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';

import { Category } from './entities/category.entity';
import { Food } from '../food/entities/food.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Food])],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}
