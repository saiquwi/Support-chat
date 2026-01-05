// src/graphql/apolloClient.ts
import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { setContext } from '@apollo/client/link/context';

// HTTP ссылка
const httpLink = new HttpLink({
  uri: '/graphql',
});

// Middleware для добавления токена в заголовки
const authLink = setContext((_, { headers }) => {
  // Получаем токен из localStorage
  const token = localStorage.getItem('token');
  
  console.log('Auth link: token present?', !!token);
  
  // Возвращаем заголовки с токеном
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

// WebSocket ссылка
const wsLink = new GraphQLWsLink(
  createClient({
    // Используйте полный URL вместо относительного
    url: window.location.protocol === 'https:' 
      ? `wss://${window.location.hostname}:4000/graphql`
      : `ws://${window.location.hostname}:4000/graphql`,
    // Или напрямую
    // url: 'ws://localhost:4000/graphql',
    connectionParams: () => {
      const token = localStorage.getItem('token');
      console.log('WS connection: token present?', !!token);
      return {
        authorization: token ? `Bearer ${token}` : '',
      };
    },
    shouldRetry: () => true,
    on: {
      connected: () => console.log('WebSocket connected'),
      error: (error) => console.error('WebSocket error:', error),
      closed: () => console.log('WebSocket closed'),
    },
  })
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  authLink.concat(httpLink) // Добавляем auth middleware к HTTP
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});