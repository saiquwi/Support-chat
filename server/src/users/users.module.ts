import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { User } from './entities/user.entity';
import { PubSubModule } from '../common/pubsub/pubsub.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PubSubModule,
  ],
  providers: [UsersService, UsersResolver],
  exports: [UsersService, TypeOrmModule], 
})
export class UsersModule {}