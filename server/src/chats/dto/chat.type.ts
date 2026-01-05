import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';
import { Message } from './message.type';

export enum ChatType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  SUPPORT = 'SUPPORT'
}

registerEnumType(ChatType, {
  name: 'ChatType',
});

@ObjectType()
export class Chat {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  title?: string;

  @Field(() => ChatType)
  type: ChatType;

  @Field(() => [User], { nullable: true })
  participants?: User[];

  @Field(() => [Message])
  messages: Message[];

  @Field(() => Message, { nullable: true })
  lastMessage?: Message;

  @Field(() => Number, { defaultValue: 0 })
  unreadCount: number;

  @Field(() => String)
  createdAt: Date;

  @Field(() => String)
  updatedAt: Date;

  @Field(() => Boolean)
  isActive: boolean;
}