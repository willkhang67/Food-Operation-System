import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'email_enc', type: 'text' })
  emailEnc: string;

  @Column({ name: 'email_blind_index', unique: true })
  emailBlindIndex: string;

  @Column({ name: 'name_enc', type: 'text' })
  nameEnc: string;

  @Column({ name: 'phone_enc', type: 'text', nullable: true })
  phoneEnc: string | null;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', default: UserRole.USER })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}