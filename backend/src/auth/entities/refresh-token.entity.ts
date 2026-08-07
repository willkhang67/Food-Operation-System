import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /** SHA-256 hex of the refresh JWT (never store raw token). */
  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true })
  tokenHash!: string;

  /** JWT `jti` — used for rotation / reuse detection. */
  @Column({ type: 'uuid', unique: true })
  jti!: string;

  /** Same id as the first token in a login session (reuse → revoke family). */
  @Column({ name: 'family_id', type: 'uuid' })
  @Index()
  familyId!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'replaced_by_jti', type: 'uuid', nullable: true })
  replacedByJti!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
