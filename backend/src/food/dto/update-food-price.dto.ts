import { IsNumber, Min } from 'class-validator';

export class UpdateFoodPriceDto {
  @IsNumber()
  @Min(0)
  price!: number;
}