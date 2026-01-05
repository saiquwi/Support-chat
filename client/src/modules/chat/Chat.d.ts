export interface User {
  id: string;
  username: string;
  email: string;
  role: 'CLIENT' | 'SUPPORT' | 'ADMIN';
  status: 'ONLINE' | 'OFFLINE' | 'AWAY';
  lastSeen?: string;
}

export interface Message {
  id: string;
  content: string;
  createdAt: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  sender: User;
  // Эти поля теперь optional если сервер их не возвращает
  readAt?: string;
  chat?: {
    id: string;
  };
  isDeleted?: boolean;
  isEdited?: boolean;
  editedAt?: string;
}

export interface Chat {
  id: string;
  title?: string;
  type: 'DIRECT' | 'GROUP' | 'SUPPORT';
  participants: User[]; // Важно! Это должно быть в subscription
  messages: Message[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}