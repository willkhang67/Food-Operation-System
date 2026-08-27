export class OrderItemResponseDto {
  id!: string;
  foodId!: string;
  foodName!: string;
  /** Minutes for one unit; snapped at order create. */
  cookTime!: number;
  unitPrice!: number;
  quantity!: number;
  lineTotal!: number;
}
