import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Chat } from './chat.entity';

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ'
}

@Entity('messages')
@Index(['chat', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text') // Важно: должно быть 'text' или 'varchar'
  content: string; // Это поле НЕ NULL

  @ManyToOne(() => User, user => user.messages, { nullable: false })
  sender: User;

  @ManyToOne(() => Chat, chat => chat.messages, { nullable: false })
  chat: Chat;

  @Column({
    type: 'varchar',
    default: MessageStatus.SENT
  })
  status: MessageStatus;

  @Column({ nullable: true })
  readAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  isEdited: boolean;

  @Column({ nullable: true })
  editedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ nullable: true })
  deletedAt: Date;
}