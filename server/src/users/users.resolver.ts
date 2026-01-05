import { Resolver, Query, Args, Mutation, Subscription } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserStatus } from './entities/user.entity'; // Используем enum из той же сущности
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PUB_SUB } from '../common/pubsub/pubsub.module';
import { PubSub } from 'graphql-subscriptions';

@Resolver(() => User)
export class UsersResolver {
  constructor(
    private usersService: UsersService,
    @Inject(PUB_SUB) private pubSub: PubSub,
  ) {}

  @Query(() => [User], { name: 'users' })
  @UseGuards(GqlAuthGuard)
  async getAllUsers() {
    return this.usersService.findAll();
  }

  @Query(() => [User], { name: 'supportAgents' })
  @UseGuards(GqlAuthGuard)
  async getSupportAgents() {
    return this.usersService.findSupportAgents();
  }

  @Query(() => [User], { name: 'onlineUsers' })
  @UseGuards(GqlAuthGuard)
  async getOnlineUsers() {
    return this.usersService.getOnlineUsers();
  }

  @Query(() => [User], { name: 'searchUsers' })
  @UseGuards(GqlAuthGuard)
  async searchUsers(@Args('query') query: string) {
    return this.usersService.searchUsers(query);
  }

  @Mutation(() => User)
  @UseGuards(GqlAuthGuard)
  async updateUserStatus(
    @CurrentUser() user: User,
    @Args('status', { type: () => UserStatus }) status: UserStatus,
  ) {
    const updatedUser = await this.usersService.updateStatus(user.id, status);
    
    // Публикуем оба события
    this.pubSub.publish('userStatusChanged', {
      userStatusChanged: updatedUser,
    });

    this.pubSub.publish('userPresenceChanged', {
      userPresenceChanged: updatedUser,
    });

    return updatedUser;
  }

  @Subscription(() => User, {
    filter: (payload, variables) => {
      // Можно фильтровать по конкретным пользователям
      // Если хотите фильтровать по userId, передавайте его как аргумент
      return true;
    },
  })
  userStatusChanged() {
    return this.pubSub.asyncIterator('userStatusChanged');
  }
}