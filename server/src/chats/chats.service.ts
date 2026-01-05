import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Chat, ChatType } from './entities/chat.entity';
import { Message, MessageStatus } from './entities/message.entity';
import { ChatParticipant } from './entities/chat-participant.entity';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat)
    private chatsRepository: Repository<Chat>,
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(ChatParticipant)
    private chatParticipantsRepository: Repository<ChatParticipant>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async createSupportChat(clientId: string, supportAgentId?: string): Promise<any> {
    // Находим клиента
    const client = await this.usersRepository.findOne({ 
      where: { id: clientId, role: UserRole.CLIENT }
    });
    
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // Находим агента поддержки
    let agent: User;
    if (supportAgentId) {
      agent = await this.usersRepository.findOne({ 
        where: { id: supportAgentId, role: UserRole.SUPPORT }
      });
    } else {
      // Находим первого доступного агента
      agent = await this.usersRepository.findOne({
        where: { 
          role: UserRole.SUPPORT,
          status: UserStatus.ONLINE
        },
        order: { lastSeen: 'DESC' }
      });
    }

    if (!agent) {
      throw new NotFoundException('No available support agents');
    }

    // Создаем чат
    const chat = this.chatsRepository.create({
      title: `Support Chat - ${client.username}`,
      type: ChatType.SUPPORT,
    });

    const savedChat = await this.chatsRepository.save(chat);

    // Добавляем участников через ChatParticipant
    await this.addParticipant(savedChat.id, client.id);
    await this.addParticipant(savedChat.id, agent.id);

    // Возвращаем чат с участниками
    return this.getChatById(savedChat.id, clientId);
  }

  async addParticipant(chatId: string, userId: string): Promise<ChatParticipant> {
    const chat = await this.chatsRepository.findOne({ where: { id: chatId } });
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!chat || !user) {
      throw new NotFoundException('Chat or user not found');
    }

    const participant = this.chatParticipantsRepository.create({
      chat,
      user,
      isActive: true,
    });

    return this.chatParticipantsRepository.save(participant);
  }

  async getChatById(chatId: string, userId: string): Promise<any> {
    // Проверяем, является ли пользователь участником
    const isParticipant = await this.chatParticipantsRepository.findOne({
      where: { 
        chat: { id: chatId },
        user: { id: userId },
        isActive: true
      }
    });

    if (!isParticipant) {
      throw new NotFoundException('Chat not found or access denied');
    }

    // Получаем чат с участниками и сообщениями
    const chat = await this.chatsRepository.findOne({
      where: { id: chatId, isActive: true },
      relations: [
        'chatParticipants',
        'chatParticipants.user',
        'messages',
        'messages.sender'
      ],
      order: {
        messages: {
          createdAt: 'ASC'
        }
      }
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const unreadCount = await this.getUnreadCountForUser(chatId, userId);

    // Преобразуем для GraphQL: создаем объект с нужной структурой
    const chatForGraphQL = {
      ...chat,
      unreadCount,
      updatedAt: chat.updatedAt,
      participants: chat.chatParticipants?.map(cp => ({
        id: cp.user.id,
        username: cp.user.username,
        role: cp.user.role,
        status: cp.user.status, // ← проверь что это поле есть
        // ... другие поля
      })) || []
    };

    return chatForGraphQL;
  }

  async getUserChats(userId: string): Promise<any[]> {
    const participants = await this.chatParticipantsRepository.find({
      where: { 
        user: { id: userId },
        isActive: true
      },
      relations: [
        'chat',
        'chat.chatParticipants',
        'chat.chatParticipants.user'
      ],
    });

    const chatPromises = participants
      .map(p => p.chat)
      .filter(chat => chat.isActive)
      .map(async (chat) => {
        // 1. Последнее сообщение
        const lastMessage = await this.messagesRepository.findOne({
          where: { chat: { id: chat.id } },
          relations: ['sender'],
          order: { createdAt: 'DESC' },
        });

        // 2. Количество непрочитанных
        const unreadCount = await this.messagesRepository.count({
          where: {
            chat: { id: chat.id },
            status: MessageStatus.SENT,
            sender: { id: Not(userId) } // Сообщения НЕ от этого пользователя
          }
        });

        return {
          id: chat.id,
          title: chat.title,
          type: chat.type,
          participants: chat.chatParticipants
            ?.filter(cp => cp.isActive)
            .map(cp => cp.user) || [],
          lastMessage,
          unreadCount,
          updatedAt: chat.updatedAt,
          createdAt: chat.createdAt,
          isActive: chat.isActive,
        };
      });

    const chats = await Promise.all(chatPromises);
    
    return chats.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async sendMessage(chatId: string, senderId: string, content: string): Promise<Message> {
    console.log('Service - sendMessage called with:', { chatId, senderId, content });
    
    if (!content || content.trim() === '') {
      throw new Error('Message content is required');
    }

    // Проверяем доступ
    const isParticipant = await this.chatParticipantsRepository.findOne({
      where: { 
        chat: { id: chatId },
        user: { id: senderId },
        isActive: true
      }
    });

    if (!isParticipant) {
      throw new NotFoundException('Access denied');
    }

    // Используем простой query builder чтобы избежать проблем с TypeORM
    const messageId = require('uuid').v4();
    
    await this.messagesRepository
      .createQueryBuilder()
      .insert()
      .into(Message)
      .values({
        id: messageId,
        content: content,
        sender: { id: senderId },
        chat: { id: chatId },
        status: MessageStatus.SENT,
        createdAt: new Date(),
      })
      .execute();

    // Получаем сохраненное сообщение с отношениями
    const savedMessage = await this.messagesRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'chat']
    });

    if (!savedMessage) {
      throw new Error('Failed to save message');
    }

    // Обновляем время чата
    await this.chatsRepository.update(chatId, {
      updatedAt: new Date(),
    });

    console.log('Service - Message saved:', savedMessage.id, 'with content:', savedMessage.content);
    
    return savedMessage;
  }

  async getChatMessages(chatId: string, userId: string, limit = 50): Promise<Message[]> {
    // Проверяем доступ
    const isParticipant = await this.chatParticipantsRepository.findOne({
      where: { 
        chat: { id: chatId },
        user: { id: userId },
        isActive: true
      }
    });

    if (!isParticipant) {
      throw new NotFoundException('Access denied');
    }

    return this.messagesRepository.find({
      where: { chat: { id: chatId } },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  async getSupportChatsForAgent(agentId: string): Promise<any[]> {
    const participants = await this.chatParticipantsRepository.find({
      where: { 
        user: { id: agentId, role: UserRole.SUPPORT },
        isActive: true,
        chat: { type: ChatType.SUPPORT, isActive: true }
      },
      relations: [
        'chat',
        'chat.chatParticipants',
        'chat.chatParticipants.user'
      ],
    });

    return participants
      .map(p => p.chat)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map(chat => ({
        ...chat,
        participants: chat.chatParticipants?.map(cp => cp.user) || []
      }));
  }

  async markAsRead(messageIds: string[], userId: string): Promise<boolean> {
    // Проверяем что messageIds - это массив строк
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      throw new Error('Message IDs must be a non-empty array');
    }

    // Используем правильный синтаксис для TypeORM
    await this.messagesRepository
      .createQueryBuilder()
      .update(Message)
      .set({ 
        status: MessageStatus.READ,
        readAt: new Date()
      })
      .where('id IN (:...ids)', { ids: messageIds }) // Ключевое исправление!
      .andWhere('senderId != :userId', { userId })
      .execute();

    return true;
  }

  async deleteChat(chatId: string, userId: string): Promise<boolean> {
    // Проверяем доступ
    const chat = await this.getChatById(chatId, userId);
    
    // Деактивируем чат
    await this.chatsRepository.update(chatId, { isActive: false });

    // Деактивируем всех участников
    await this.chatParticipantsRepository.update(
      { chat: { id: chatId } },
      { isActive: false, leftAt: new Date() }
    );

    return true;
  }

  async createChat(participantIds: string[], title?: string): Promise<any> {
    const users = await this.usersRepository.find({
      where: { id: In(participantIds) }
    });

    if (users.length === 0) {
      throw new NotFoundException('No participants found');
    }

    // Определяем тип чата
    let type = ChatType.GROUP;
    if (users.length === 2) {
      type = ChatType.DIRECT;
    }

    // Создаем чат
    const chat = this.chatsRepository.create({
      title: type === ChatType.DIRECT ? null : (title || 'Group Chat'),
      type,
    });

    const savedChat = await this.chatsRepository.save(chat);

    // Добавляем участников
    for (const user of users) {
      await this.addParticipant(savedChat.id, user.id);
    }

    return this.getChatById(savedChat.id, participantIds[0]);
  }

  // Вспомогательный метод для получения участников чата
  async getChatParticipants(chatId: string): Promise<User[]> {
    const participants = await this.chatParticipantsRepository.find({
      where: { 
        chat: { id: chatId },
        isActive: true 
      },
      relations: ['user']
    });

    return participants.map(p => p.user);
  }

  // Добавьте эти методы в класс ChatsService:
  async getUnreadMessages(userId: string): Promise<Message[]> {
    return this.messagesRepository.find({
      where: {
        status: MessageStatus.SENT,
        sender: { id: Not(userId) }, // сообщения не от текущего пользователя
        chat: {
          isActive: true,
          chatParticipants: {
            user: { id: userId },
            isActive: true
          }
        }
      },
      relations: ['sender', 'chat', 'chat.chatParticipants', 'chat.chatParticipants.user'],
      order: { createdAt: 'DESC' }
    });
  }

  async getUnreadCountForUser(chatId: string, userId: string): Promise<number> {
    const count = await this.messagesRepository.count({
      where: {
        chat: { id: chatId },
        status: MessageStatus.SENT,
        sender: { id: Not(userId) }, // сообщения не от текущего пользователя
      },
      relations: ['chat', 'sender'],
    });

    console.log(`🔢 Unread count for user ${userId} in chat ${chatId}: ${count}`);
    
    return count;
  }

  async getActiveSupportChats(agentId: string): Promise<Chat[]> {
    const participants = await this.chatParticipantsRepository.find({
      where: {
        user: { id: agentId, role: UserRole.SUPPORT },
        isActive: true,
        chat: {
          type: ChatType.SUPPORT,
          isActive: true
        }
      },
      relations: [
        'chat',
        'chat.chatParticipants',
        'chat.chatParticipants.user',
        'chat.messages',
        'chat.messages.sender'
      ],
    });

    const chats = participants.map(p => p.chat);
    
    // Добавляем lastMessage и unreadCount
    return chats.map(chat => {
      const messages = chat.messages || [];
      const lastMessage = messages.length > 0 
        ? messages[messages.length - 1] 
        : null;
      
      const unreadCount = messages.filter(msg => 
        msg.status === MessageStatus.SENT && 
        msg.sender.id !== agentId
      ).length;

      return {
        ...chat,
        participants: chat.chatParticipants?.map(cp => cp.user) || [],
        lastMessage,
        unreadCount
      };
    }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Вспомогательный метод для получения lastMessage
  async getLastMessage(chatId: string): Promise<Message | null> {
    return this.messagesRepository.findOne({
      where: { chat: { id: chatId } },
      order: { createdAt: 'DESC' },
      relations: ['sender']
    });
  }

  async getMessageById(messageId: string): Promise<Message | null> {
    return this.messagesRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'chat']
    });
  }

  
  async simpleMarkMessageAsRead(messageId: string): Promise<void> {
    await this.messagesRepository.update(messageId, {
      status: MessageStatus.READ,
      readAt: new Date()
    });
  }
    

}