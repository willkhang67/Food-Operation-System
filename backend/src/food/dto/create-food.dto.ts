import {IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsArray, IsUUID, Min, IsInt,} from 'class-validator';

export class CreateFoodDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(0)
  cookTime!: number;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_available?: boolean;

  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}
