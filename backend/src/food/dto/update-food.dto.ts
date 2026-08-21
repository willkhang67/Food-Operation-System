import { IsOptional, IsString } from 'class-validator';

export class UpdateFoodDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  cookTime?: number;
}
