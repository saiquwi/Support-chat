import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Валидация
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true, // Убедитесь, что это true
    validationError: {
      target: false, // Не возвращайте исходный объект в ошибке
    }
  }));
  
  // CORS для клиента
  app.enableCors({
    origin: [
      'https://studio.apollographql.com', // Apollo Studio
      'http://localhost:3000', // React-клиент
      'http://localhost:4000', // GraphQL Playground
      'http://localhost:5173', // Vite
    ],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  const port = 4000;
  await app.listen(port);
  
  console.log('Support Chat Server запущен!');
  console.log(`GraphQL endpoint: http://localhost:${port}/graphql`);
  console.log(`WebSocket: ws://localhost:${port}/graphql`);
  console.log('Apollo studio: https://studio.apollographql.com/sandbox');
}
bootstrap();