import { CategoryResponseDto } from '../../category/dto/category-response.dto';

export class FoodResponseDto {
  id!: string;
  name!: string;
  price!: number;
  description!: string | null;
  is_available!: boolean;
  status!: number;
  categories!: CategoryResponseDto[];
  images?: { id: string; url: string }[];
  createdAt!: Date;
  updatedAt!: Date;
}