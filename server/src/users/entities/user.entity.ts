import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn, 
  OneToMany 
} from 'typeorm';
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql'; // Добавляем
import { ChatParticipant } from '../../chats/entities/chat-participant.entity';
import { Message } from '../../chats/entities/message.entity';

export enum UserRole {
  CLIENT = 'CLIENT',
  SUPPORT = 'SUPPORT',
  ADMIN = 'ADMIN'
}

export enum UserStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  AWAY = 'AWAY'
}

// Регистрируем enum для GraphQL
registerEnumType(UserRole, {
  name: 'UserRole',
});

registerEnumType(UserStatus, {
  name: 'UserStatus',
});

@ObjectType() // Добавляем - это делает сущность GraphQL типом
@Entity('users')
export class User {
  @Field(() => ID) // Добавляем
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field() // Добавляем
  @Column({ unique: true })
  username: string;

  @Field() // Добавляем
  @Column({ unique: true })
  email: string;

  @Column() // БЕЗ @Field() - пароль НЕ будет в GraphQL схеме
  password: string;

  @Field(() => UserRole) // Добавляем
  @Column({
    type: 'varchar', 
    default: UserRole.CLIENT
  })
  role: UserRole;

  @Field(() => UserStatus) // Добавляем
  @Column({
    type: 'varchar',
    default: UserStatus.OFFLINE
  })
  status: UserStatus;

  @Field(() => String, { nullable: true }) // Добавляем
  @Column({ nullable: true })
  lastSeen: Date;

  @Field({ nullable: true }) // Добавляем
  @Column({ nullable: true })
  avatarUrl: string;

  // Эти поля НЕ нужны в GraphQL ответах, оставляем без @Field()
  @OneToMany(() => ChatParticipant, participant => participant.user)
  chatParticipants: ChatParticipant[];

  @OneToMany(() => Message, message => message.sender)
  messages: Message[];

  @Field() // Добавляем
  @CreateDateColumn()
  createdAt: Date;

  @Field() // Добавляем
  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true }) // БЕЗ @Field()
  refreshToken: string;

  @Column({ default: true }) // БЕЗ @Field()
  isActive: boolean;
}