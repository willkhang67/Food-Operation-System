import { IsOptional, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'Name field cannot be empty' })
  // @MinLength(1)
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
