import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlindIndexService } from '../crypto/blind-index.service';
import { FieldEncryptionService } from '../crypto/field-encryption.service';
import { PasswordHasherService } from '../crypto/password-hasher.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly passwordHasher: PasswordHasherService,
    private readonly fieldEncryption: FieldEncryptionService,
    private readonly blindIndex: BlindIndexService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const normalizedEmail = this.blindIndex.normalizeEmail(createUserDto.email);
    const emailBlindIndex = this.blindIndex.create(normalizedEmail);

    const existing = await this.userRepository.findOne({
      where: { emailBlindIndex },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const user = this.userRepository.create({
      emailEnc: this.fieldEncryption.encrypt(normalizedEmail),
      emailBlindIndex,
      nameEnc: this.fieldEncryption.encrypt(createUserDto.name),
      phoneEnc: createUserDto.phone
        ? this.fieldEncryption.encrypt(createUserDto.phone)
        : null,
      passwordHash: await this.passwordHasher.hash(createUserDto.password),
    });

    const saved = await this.userRepository.save(user);
    return this.toResponseDto(saved);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find();
    return users.map((user) => this.toResponseDto(user));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.findEntityById(id);
    return this.toResponseDto(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = this.blindIndex.normalizeEmail(email);
    const emailBlindIndex = this.blindIndex.create(normalizedEmail);
    return this.userRepository.findOne({ where: { emailBlindIndex } });
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return this.passwordHasher.verify(password, user.passwordHash);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.findEntityById(id);

    if (updateUserDto.email !== undefined) {
      const normalizedEmail = this.blindIndex.normalizeEmail(
        updateUserDto.email,
      );
      const emailBlindIndex = this.blindIndex.create(normalizedEmail);

      if (emailBlindIndex !== user.emailBlindIndex) {
        const existing = await this.userRepository.findOne({
          where: { emailBlindIndex },
        });
        if (existing) {
          throw new ConflictException('Email already registered');
        }
      }

      user.emailBlindIndex = emailBlindIndex;
      user.emailEnc = this.fieldEncryption.encrypt(normalizedEmail);
    }

    if (updateUserDto.name !== undefined) {
      user.nameEnc = this.fieldEncryption.encrypt(updateUserDto.name);
    }

    if (updateUserDto.phone !== undefined) {
      user.phoneEnc = updateUserDto.phone
        ? this.fieldEncryption.encrypt(updateUserDto.phone)
        : null;
    }

    if (updateUserDto.password !== undefined) {
      user.passwordHash = await this.passwordHasher.hash(
        updateUserDto.password,
      );
    }

    const saved = await this.userRepository.save(user);
    return this.toResponseDto(saved);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findEntityById(id);
    await this.userRepository.remove(user);
  }

  private async findEntityById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  private toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: this.fieldEncryption.decrypt(user.emailEnc),
      name: this.fieldEncryption.decrypt(user.nameEnc),
      phone: user.phoneEnc
        ? this.fieldEncryption.decrypt(user.phoneEnc)
        : null,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
