import { Resolver, Query, Args, Mutation, Subscription } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { Chat } from './dto/chat.type';
import { Message, MessageStatus } from './dto/message.type';
import { CreateChatInput } from './dto/inputs/create-chat.input';
import { SendMessageInput } from './dto/inputs/send-message.input';
import { MarkReadInput } from './dto/inputs/mark-read.input';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PUB_SUB } from '../common/pubsub/pubsub.module';
import { PubSub } from 'graphql-subscriptions';

@Resolver(() => Chat)
export class ChatsResolver {
  constructor(
    private chatsService: ChatsService,
    @Inject(PUB_SUB) private pubSub: PubSub,
  ) {}

  @Query(() => [Chat], { name: 'myChats' })
  @UseGuards(GqlAuthGuard)
  async getMyChats(@CurrentUser() user: User) {
    return this.chatsService.getUserChats(user.id);
  }

  @Query(() => Chat, { name: 'chat' })
  @UseGuards(GqlAuthGuard)
  async getChat(
    @Args('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.chatsService.getChatById(id, user.id);
  }

  @Query(() => [Message], { name: 'chatMessages' })
  @UseGuards(GqlAuthGuard)
  async getChatMessages(
    @Args('chatId') chatId: string,
    @Args('limit', { nullable: true, defaultValue: 50 }) limit: number,
    @CurrentUser() user: User,
  ) {
    return this.chatsService.getChatMessages(chatId, user.id, limit);
  }

  @Mutation(() => Chat)
  @UseGuards(GqlAuthGuard)
  async createSupportChat(
    @CurrentUser() user: User,
    @Args('supportAgentId', { nullable: true }) supportAgentId?: string,
  ) {
    if (user.role !== 'CLIENT') {
      throw new Error('Only clients can create support chats');
    }

    const chat = await this.chatsService.createSupportChat(user.id, supportAgentId);

    for (const participant of chat.chatParticipants) {
      if (participant.user.id !== user.id) {
        // Уведомляем о новом чате
        this.pubSub.publish('chatCreated', {
          chatCreated: chat,
          userId: participant.user.id,
        });
        
        // И обновляем существующий список
        this.pubSub.publish('chatUpdated', {
          chatUpdated: chat,
          userId: participant.user.id,
        });
      }
    }

    return chat;
  }

  @Query(() => [Chat], { name: 'getSupportChats' })
  @UseGuards(GqlAuthGuard)
  async getSupportChats(
    @CurrentUser() user: User,
  ) {
    if (user.role !== 'SUPPORT' && user.role !== 'ADMIN') {
      throw new Error('Only support agents can view support chats');
    }

    return this.chatsService.getSupportChatsForAgent(user.id);
  }

  @Mutation(() => Chat)
  @UseGuards(GqlAuthGuard)
  async createChat(
    @Args('createChatInput') createChatInput: CreateChatInput,
    @CurrentUser() user: User,
  ) {
    const participantIds = Array.isArray(createChatInput.participantIds) 
      ? createChatInput.participantIds 
      : [];
    
    const allParticipantIds = [user.id, ...participantIds];
    
    const chat = await this.chatsService.createChat(
      allParticipantIds,
      createChatInput.title,
    );

    // Публикуем событие о создании чата
    this.pubSub.publish('chatUpdated', {
      chatUpdated: chat,
      userId: user.id,
    });

    // Также уведомляем других участников
    for (const participant of chat.chatParticipants) { // ← ИСПРАВЛЕНО
      if (participant.user.id !== user.id) { // ← ИСПРАВЛЕНО
        this.pubSub.publish('chatUpdated', {
          chatUpdated: chat,
          userId: participant.user.id, // ← ИСПРАВЛЕНО
        });
      }
    }

    return chat;
  }

  @Mutation(() => Message)
  @UseGuards(GqlAuthGuard)
  async sendMessage(
    @Args('sendMessageInput') sendMessageInput: SendMessageInput,
    @CurrentUser() user: User,
  ) {
    console.log('Resolver - Sending message:', {
      chatId: sendMessageInput.chatId,
      senderId: user.id,
      content: sendMessageInput.content,
    });

    if (!sendMessageInput.content || sendMessageInput.content.trim() === '') {
      throw new Error('Message content cannot be empty');
    }

    const message = await this.chatsService.sendMessage(
      sendMessageInput.chatId,
      user.id,
      sendMessageInput.content,
    );

    console.log('Resolver - Message sent successfully:', message.id);

    const participants = await this.chatsService.getChatParticipants(sendMessageInput.chatId);
    
    console.log('Participants:', participants.map(p => ({
      id: p.id,
      username: p.username,
      role: p.role
    })));
    
    // Дедупликация участников
    const uniqueParticipants = participants.filter(
      (p, index, self) => self.findIndex(pp => pp.id === p.id) === index
    );

    // Вместо цикла по всем участникам:
    if (uniqueParticipants.length > 0) {
      const recipient = uniqueParticipants.find(p => p.id !== user.id);
      
      if (recipient) {
        console.log(`📤 SINGLE publish to: ${recipient.username}`);
        
        const recipientChat = await this.chatsService.getChatById(sendMessageInput.chatId, recipient.id);
        const unreadCount = await this.chatsService.getUnreadCountForUser(
          sendMessageInput.chatId,
          recipient.id
        );

        console.log('📊 Calculated unreadCount for recipient:', {
          recipientId: recipient.id,
          unreadCount,
          chatId: sendMessageInput.chatId
        });

        // СОЗДАЕМ объект чата С unreadCount
        const chatWithUnreadCount = {
          id: sendMessageInput.chatId,
          title: message.chat?.title || `Support Chat`,
          type: 'SUPPORT',
          unreadCount: unreadCount, // ← ВОТ ОН!
          __typename: 'Chat' as const
        };

        console.log('📤 Publishing with chat object:', {
          chatWithUnreadCount,
          hasUnreadCount: 'unreadCount' in chatWithUnreadCount,
          unreadCountValue: chatWithUnreadCount.unreadCount,
          recipientId: recipient.id
        });
        
        // Публикуем с правильными данными
        await this.pubSub.publish('newMessage', {
          newMessage: {
            ...message,
            chat: chatWithUnreadCount, // ← отправляем чат с unreadCount
          },
          recipientId: recipient.id,
          chatId: sendMessageInput.chatId,
          senderId: user.id,
        });
      }
    }
    
    //console.log(`Total publishes: ${publishCount}`);
    
    return message;
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async markMultipleAsRead(
    @Args('ids', { type: () => [String] }) messageIds: string[],
    @CurrentUser() user: User,
  ) {
    console.log('Marking messages as read:', { messageIds, userId: user.id });
    
    // Важно: помечаем только сообщения НЕ от текущего пользователя
    const result = await this.chatsService.markAsRead(messageIds, user.id);
    
    // Публикуем событие об обновлении статуса
    for (const messageId of messageIds) {
      const message = await this.chatsService.getMessageById(messageId);
      if (message) {
        // Получаем всех участников чата
        const participants = await this.chatsService.getChatParticipants(message.chat.id);
        
        const updatedMessage = {
          ...message,
          status: MessageStatus.READ,
          readAt: new Date()
        };

        // Публикуем для каждого участника
        for (const participant of participants) {
          this.pubSub.publish('messageStatusChanged', {
            messageStatusChanged: updatedMessage, // ← полный Message объект
            chatId: message.chat.id,
            userId: participant.id // фильтруем на клиенте по chatId
          });
        }
      }
    }
    
    return result;
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async deleteChat(
    @Args('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.chatsService.deleteChat(id, user.id);
  }

  @Query(() => [Message], { name: 'unreadMessages' })
  @UseGuards(GqlAuthGuard)
  async getUnreadMessages(@CurrentUser() user: User) {
    return this.chatsService.getUnreadMessages(user.id);
  }

  @Query(() => [Chat], { name: 'activeSupportChats' })
  @UseGuards(GqlAuthGuard)
  async getActiveSupportChats(@CurrentUser() user: User) {
    if (user.role !== 'SUPPORT' && user.role !== 'ADMIN') {
      throw new Error('Only support agents can view active support chats');
    }
    return this.chatsService.getActiveSupportChats(user.id);
  }

  // Подписки
  @Subscription(() => Chat, {
    filter: (payload, variables) => {
      return payload.userId === variables.userId;
    },
  })
  chatStatusChanged(@Args('userId') userId: string) {
    return this.pubSub.asyncIterator('chatStatusChanged');
  }

  @Subscription(() => Chat, {
    filter: (payload, variables) => {
      return payload.userId === variables.userId;
    },
  })
  chatUpdated(@Args('userId') userId: string) {
    return this.pubSub.asyncIterator('chatUpdated');
  }

  @Subscription(() => User)
  userPresenceChanged() {
    return this.pubSub.asyncIterator('userPresenceChanged');
  }

  @Subscription(() => Message, {
    filter: (payload, variables) => {
      // Фильтруем только по chatId
      return payload.chatId === variables.chatId;
    },
    resolve: (payload) => {
      return payload.messageSent;
    }
  })
  messageSent(@Args('chatId') chatId: string) {
    console.log('Message subscription for chat:', chatId);
    return this.pubSub.asyncIterator('messageSent');
  }

  @Subscription(() => Message, {
    name: 'messageStatusChanged',
    filter: (payload, variables) => {
      // Фильтруем по chatId - обновления статуса только для конкретного чата
      return payload.chatId === variables.chatId;
    },
    resolve: (payload) => {
      // Возвращаем обновленный статус сообщения
      return payload.messageStatusChanged;
    }
  })
  messageStatusChanged(@Args('chatId') chatId: string) {
    console.log('Message status subscription for chat:', chatId);
    return this.pubSub.asyncIterator('messageStatusChanged');
  }

  @Subscription(() => Message, {
    name: 'newMessage',
    filter: (payload, variables) => {
      return payload.recipientId === variables.userId;
    },
    resolve: async (payload) => {
      const { newMessage, recipientId, chatId } = payload;
      console.log('📦 Subscription resolve - INCOMING payload:', {
        newMessageId: newMessage.id,
        chatInPayload: newMessage.chat,
        hasUnreadCount: newMessage.chat?.unreadCount !== undefined,
        unreadCountValue: newMessage.chat?.unreadCount,
        fullPayload: payload // ← Логируем ВСЁ
      });
      
      // Просто возвращаем как есть - unreadCount уже добавлен в мутации
      return newMessage;
    },
  })
  newMessage(@Args('userId') userId: string) {
    console.log('New message subscription for user:', userId);
    return this.pubSub.asyncIterator('newMessage');
  }

  @Subscription(() => Chat, {
    filter: (payload, variables) => {
      return payload.userId === variables.userId;
    },
  })
  chatCreated(@Args('userId') userId: string) {
    console.log('New chat subscription for user:', userId);
    return this.pubSub.asyncIterator('chatCreated');
  }
}