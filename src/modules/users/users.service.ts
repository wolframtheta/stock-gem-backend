import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../auth/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  fairId: string | null;
  fairName?: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  private toResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      fairId: user.fairId ?? null,
      fairName: user.fair?.name ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async findAll(): Promise<UserResponse[]> {
    const users = await this.userRepository.find({
      relations: ['fair'],
      order: { createdAt: 'DESC' },
    });
    return users.map((u) => this.toResponse(u));
  }

  async findOne(id: string): Promise<UserResponse> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['fair'],
    });
    if (!user) {
      throw new NotFoundException('Usuari no trobat');
    }
    return this.toResponse(user);
  }

  async create(dto: CreateUserDto): Promise<UserResponse> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Ja existeix un usuari amb aquest email');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      role: dto.role ?? UserRole.BOTIGA,
      fairId: dto.fairId ?? null,
    });

    const saved = await this.userRepository.save(user);
    return this.toResponse(saved);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponse> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuari no trobat');
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Ja existeix un usuari amb aquest email');
      }
    }

    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }
    if (dto.email) user.email = dto.email;
    if (dto.name) user.name = dto.name;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.fairId !== undefined) user.fairId = dto.fairId;

    const saved = await this.userRepository.save(user);
    return this.toResponse(saved);
  }

  async remove(id: string): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Usuari no trobat');
    }
  }
}
