import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatsService } from './chats.service';
import { ChatsResolver } from './chats.resolver';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';
import { ChatParticipant } from './entities/chat-participant.entity'; // Добавляем
import { User } from '../users/entities/user.entity';
import { PubSubModule } from '../common/pubsub/pubsub.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, Message, ChatParticipant, User]), // Добавляем ChatParticipant
    PubSubModule,
    UsersModule,
  ],
  providers: [ChatsService, ChatsResolver],
  exports: [ChatsService],
})
export class ChatsModule {}