import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../user/enums/user-role.enum';
import { FoodBasicDto } from './dto/food-basic.dto';
import { CreateFoodDto } from './dto/create-food.dto';
import { FoodResponseDto } from './dto/food-response.dto';
import { UpdateFoodDto } from './dto/update-food.dto';
import { UpdateFoodPriceDto } from './dto/update-food-price.dto';
import { FoodImage } from './entities/food-image.entity';
import { FoodImageService } from './food-image.service';
import { FoodService } from './food.service';

@SkipThrottle()
@Controller('food')
export class FoodController {
  constructor(
    private readonly foodService: FoodService,
    private readonly foodImageService: FoodImageService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateFoodDto): Promise<FoodResponseDto> {
    return this.foodService.create(dto);
  }

  /** Public: active foods only. */
  @Get()
  findAll(): Promise<FoodResponseDto[]> {
    return this.foodService.findAll(false);
  }

  /** Admin: active + inactive. Must stay above :id. */
  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAllIncludingInactive(): Promise<FoodResponseDto[]> {
    return this.foodService.findAll(true);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<FoodResponseDto> {
    return this.foodService.findOne(id);
  }

  @Get(':id/price')
  getPriceHistory(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FoodBasicDto[]> {
    return this.foodService.getPriceHistory(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFoodDto,
  ): Promise<FoodResponseDto> {
    return this.foodService.update(id, dto);
  }

  @Patch(':name/price')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updatePrice(
    @Param('name') name: string,
    @Body() dto: UpdateFoodPriceDto,
  ): Promise<FoodBasicDto> {
    return this.foodService.updatePrice(name, dto);
  }

  @Patch(':id/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  toggleAvailability(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FoodBasicDto> {
    return this.foodService.toggleAvailability(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  softRemove(@Param('id', ParseUUIDPipe) id: string): Promise<FoodResponseDto> {
    return this.foodService.softRemove(id);
  }

  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  hardRemove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.foodService.hardRemove(id);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ): Promise<void> {
    return this.foodImageService.removeImage(id, imageId);
  }
}
