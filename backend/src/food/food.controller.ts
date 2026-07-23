import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { FoodImage } from './entities/food-image.entity';

import { FoodService } from './food.service';
import { FoodImageService } from './food-image.service';

import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';
import { UpdateFoodPriceDto } from './dto/update-food-price.dto';
import { FoodResponseDto } from './dto/food-response.dto';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller('food')
export class FoodController {
  constructor(
    private readonly foodService: FoodService,
    private readonly foodImageService: FoodImageService,
  ) {}

  @Post()
  create(@Body() dto: CreateFoodDto): Promise<FoodResponseDto> {
    return this.foodService.create(dto);
  }

  @Get()
  findAll(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<FoodResponseDto[]> {
    return this.foodService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<FoodResponseDto> {
    return this.foodService.findOne(id);
  }

  // Xem toàn bộ lịch sử giá
  @Get(':id/price-history')
  getPriceHistory(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FoodResponseDto[]> {
    return this.foodService.getPriceHistory(id);
  }

  // Update thông tin - chỉ description
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFoodDto,
  ): Promise<FoodResponseDto> {
    return this.foodService.update(id, dto);
  }

  // Update giá - tạo bản ghi mới, giữ lịch sử (taij status =0)
  @Patch(':id/price')
  updatePrice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFoodPriceDto,
  ): Promise<FoodResponseDto> {
    return this.foodService.updatePrice(id, dto);
  }

  @Delete(':id')
  softRemove(@Param('id', ParseUUIDPipe) id: string): Promise<FoodResponseDto> {
    return this.foodService.softRemove(id);
  }

  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  hardRemove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.foodService.hardRemove(id);
  }

  // IMAGE Food

  @Post(':id/images')
  addImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('url') url: string,
  ): Promise<FoodImage> {
    return this.foodImageService.addImage(id, url);
  }

  @Get(':id/images')
  getImages(@Param('id', ParseUUIDPipe) id: string): Promise<FoodImage[]> {
    return this.foodImageService.getImagesByFood(id);
  }

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ): Promise<void> {
    return this.foodImageService.removeImage(id, imageId);
  }
}
