import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  OneToMany,
  JoinTable,
} from 'typeorm';
import { Category } from '../../category/entities/category.entity';
import { FoodImage } from './food-image.entity';

@Entity('foods')
export class Food {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 150,
    nullable: false,
    // unique: true,
  })
  name!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  price!: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    type: 'boolean',
    default: true,
  })
  is_available!: boolean;

  @Column({ type: 'int', default: 1 })
  status!: number;

  @Column({
    name: 'cook_time',
    type: 'int',
  })
  cookTime!: number;

  @ManyToMany(() => Category, (category) => category.foods)
  @JoinTable({
    name: 'food_categories',
    joinColumn: { name: 'foodId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
  })
  categories!: Category[];

  @Column({ type: 'uuid', nullable: true })
  headImageId!: string | null;

  @OneToMany(() => FoodImage, (image) => image.food)
  images!: FoodImage[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
