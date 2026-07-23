import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Food } from './food.entity';

@Entity('food_images')
export class FoodImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 500, nullable: false })
  url!: string;

  @Column({ type: 'uuid', nullable: false })
  foodId!: string;

  @ManyToOne(() => Food, (food) => food.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'foodId' })
  food!: Food;

  @Column({ type: 'uuid', nullable: true })
  nextImageId!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
