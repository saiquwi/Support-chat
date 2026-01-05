import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from './users/entities/user.entity';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    console.log('Creating test users...');

    // Test users
    const users = [
      {
        username: 'client1',
        email: 'client1@test.com',
        password: await bcrypt.hash('password123', 10),
        role: UserRole.CLIENT,
        status: UserStatus.ONLINE,
        lastSeen: new Date(),
      },
      {
        username: 'client2',
        email: 'client2@test.com',
        password: await bcrypt.hash('password123', 10),
        role: UserRole.CLIENT,
        status: UserStatus.ONLINE,
        lastSeen: new Date(),
      },
      {
        username: 'support_agent',
        email: 'support@test.com',
        password: await bcrypt.hash('password123', 10),
        role: UserRole.SUPPORT,
        status: UserStatus.ONLINE,
        lastSeen: new Date(),
      },
      {
        username: 'admin',
        email: 'admin@test.com',
        password: await bcrypt.hash('password123', 10),
        role: UserRole.ADMIN,
        status: UserStatus.ONLINE,
        lastSeen: new Date(),
      },
    ];

    for (const userData of users) {
      try {
        const existingUser = await dataSource.getRepository(User).findOne({
          where: [
            { email: userData.email },
            { username: userData.username }
          ]
        });
        
        if (!existingUser) {
          await dataSource.getRepository(User).save(userData);
          console.log(`✓ Created user: ${userData.username} (${userData.role})`);
        } else {
          console.log(`✓ User ${userData.username} already exists`);
        }
      } catch (error) {
        console.error(`✗ Error creating user ${userData.username}:`, error.message);
      }
    }
    
    console.log('\nSeed completed successfully!');
    console.log('\nTest users:');
    console.log('-----------------');
    console.log('Client 1: client1@test.com / password123');
    console.log('Client 2: client2@test.com / password123');
    console.log('Support: support@test.com / password123');
    console.log('Admin: admin@test.com / password123');
    
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await app.close();
    process.exit(0);
  }
}

seed();