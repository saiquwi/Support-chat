// src/graphql/operations.ts
import { gql } from '@apollo/client';

// Auth
export const LOGIN = gql`
  mutation Login($loginInput: LoginInput!) {
    login(loginInput: $loginInput) {
      accessToken
      refreshToken
      user {
        id
        username
        email
        role
        status
      }
    }
  }
`;

export const REGISTER = gql`
  mutation Register($registerInput: RegisterInput!) {
    register(registerInput: $registerInput) {
      accessToken
      refreshToken
      user {
        id
        username
        email
        role
        status
      }
    }
  }
`;

export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      username
      email
      role
      status
      lastSeen
    }
  }
`;

// Chats
export const GET_MY_CHATS = gql`
  query GetMyChats {
    myChats {
      id
      title
      type
      participants {
        id
        username
        role
        status
      }
      lastMessage {
        id
        content
        createdAt
        status
        sender {
          id
          username
        }
      }
      unreadCount
      updatedAt
    }
  }
`;

export const GET_CHAT = gql`
  query GetChat($id: String!) {
    chat(id: $id) {
      id
      title
      type
      participants {
        id
        username
        role
        status
      }
      messages {
        id
        content
        createdAt
        status
        sender {
          id
          username
          role
        }
      }
    }
  }
`;

export const GET_CHAT_MESSAGES = gql`
  query GetChatMessages($chatId: String!, $limit: Float) {
    chatMessages(chatId: $chatId, limit: $limit) {
      id
      content
      createdAt
      status
      sender {
        id
        username
        role
        status
      }
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($sendMessageInput: SendMessageInput!) {
    sendMessage(sendMessageInput: $sendMessageInput) {
      id
      content
      createdAt
      status
      sender {
        id
        username
        role
      }
    }
  }
`;

export const MARK_AS_READ = gql`
  mutation MarkAsRead($messageIds: [String!]!) {
    markMultipleAsRead(ids: $messageIds)
  }
`;

export const CREATE_SUPPORT_CHAT = gql`
  mutation CreateSupportChat($supportAgentId: String) {
    createSupportChat(supportAgentId: $supportAgentId) {
      id
      title
      type
      participants {
        id
        username
        role
        status
      }
    }
  }
`;

// Subscriptions

export const USER_STATUS_CHANGED_SUBSCRIPTION = gql`
  subscription OnUserStatusChanged {
    userStatusChanged {
      id
      username
      status
      lastSeen
    }
  }
`;

export const MESSAGE_STATUS_CHANGED_SUBSCRIPTION = gql`
  subscription OnMessageStatusChanged($chatId: String!) {
    messageStatusChanged(chatId: $chatId) {
      id
      status
      readAt
    }
  }
`;

// Support specific
export const GET_SUPPORT_CHATS = gql`
  query GetSupportChats {
    getSupportChats {
      id
      title
      type
      participants {
        id
        username
        role
        status
      }
      lastMessage {
        id
        content
        createdAt
      }
      unreadCount
    }
  }
`;

export const GET_ACTIVE_SUPPORT_CHATS = gql`
  query GetActiveSupportChats {
    activeSupportChats {
      id
      title
      participants {
        id
        username
        role
      }
      lastMessage {
        id
        content
        createdAt
      }
      unreadCount
    }
  }
`;

export const NEW_MESSAGE_SUBSCRIPTION = gql`
  subscription NewMessage($userId: String!) {
    newMessage(userId: $userId) {
      id
      content
      createdAt
      status
      sender {
        id
        username
      }
      chat {
        id
        title
        type
      }
    }
  }
`;

export const CHAT_CREATED_SUBSCRIPTION = gql`
  subscription OnChatCreated($userId: String!) {
    chatCreated(userId: $userId) {
      id
      title
      type
      participants {
        id
        username
        role
        status
      }
      lastMessage {
        id
        content
        createdAt
        sender {
          username
        }
      }
      unreadCount
      updatedAt
    }
  }
`;