import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateOrderItemDto {
  @IsUUID('4')
  foodId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
