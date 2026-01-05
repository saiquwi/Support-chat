import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
import { AuthResponse } from './dto/auth.response';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({ 
      where: { email }
    });
    
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    return null;
  }

  async login(loginInput: LoginInput): Promise<AuthResponse> {
    const user = await this.validateUser(loginInput.email, loginInput.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Обновляем статус
    user.status = UserStatus.ONLINE;
    user.lastSeen = new Date();
    await this.usersRepository.save(user);

    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role 
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user, // Возвращаем полную сущность - пароль не будет в GraphQL ответе
    };
  }

  async register(registerInput: RegisterInput): Promise<AuthResponse> {
    const { password, ...rest } = registerInput;
    
    // Проверяем, существует ли пользователь
    const existingUser = await this.usersRepository.findOne({
      where: [
        { email: registerInput.email },
        { username: registerInput.username }
      ]
    });

    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    // Хэшируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем пользователя
    const user = this.usersRepository.create({
      ...rest,
      password: hashedPassword,
      status: UserStatus.ONLINE,
    });

    const savedUser = await this.usersRepository.save(user);

    const payload = { 
      email: savedUser.email, 
      sub: savedUser.id, 
      role: savedUser.role 
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user: savedUser, // Возвращаем полную сущность
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.usersRepository.findOne({ 
        where: { id: payload.sub } 
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newPayload = { 
        email: user.email, 
        sub: user.id, 
        role: user.role 
      };

      const newAccessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user, // Возвращаем полную сущность
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<boolean> {
    await this.usersRepository.update(userId, { 
      status: UserStatus.OFFLINE,
      lastSeen: new Date(),
      refreshToken: null
    });
    return true;
  }

  async validateToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      return null;
    }
  }
}