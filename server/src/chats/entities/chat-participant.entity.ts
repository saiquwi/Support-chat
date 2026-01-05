import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Column } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Chat } from './chat.entity';

@Entity('chat_participants')
export class ChatParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.chatParticipants, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Chat, chat => chat.chatParticipants, { onDelete: 'CASCADE' })
  chat: Chat;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  joinedAt: Date;

  @Column({ nullable: true })
  leftAt: Date;
}