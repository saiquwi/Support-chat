import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User as UserEntity, UserRole, UserStatus } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<UserEntity> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findAll(): Promise<UserEntity[]> {
    return this.usersRepository.find();
  }

  async findSupportAgents(): Promise<UserEntity[]> {
    return this.usersRepository.find({
      where: { role: UserRole.SUPPORT },
      order: { status: 'DESC', lastSeen: 'DESC' }
    });
  }

  async updateStatus(userId: string, status: UserStatus): Promise<UserEntity> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.status = status;
    user.lastSeen = new Date();
    
    return this.usersRepository.save(user);
  }

  async updateLastSeen(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      lastSeen: new Date()
    });
  }

  async getOnlineUsers(): Promise<UserEntity[]> {
    return this.usersRepository.find({
      where: { status: UserStatus.ONLINE }
    });
  }

  async searchUsers(query: string): Promise<UserEntity[]> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.username LIKE :query', { query: `%${query}%` })
      .orWhere('user.email LIKE :query', { query: `%${query}%` })
      .limit(10)
      .getMany();
  }
}