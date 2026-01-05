import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';
import { Chat } from './chat.type';

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ'
}

registerEnumType(MessageStatus, {
  name: 'MessageStatus',
});

@ObjectType()
export class Message {
  @Field(() => ID)
  id: string;

  @Field()
  content: string;

  @Field(() => User)
  sender: User;

  @Field(() => Chat)
  chat: Chat;

  @Field(() => MessageStatus)
  status: MessageStatus;

  @Field(() => String, { nullable: true })
  readAt?: Date;

  @Field(() => String)
  createdAt: Date;

  @Field(() => Boolean)
  isEdited: boolean;

  @Field(() => String, { nullable: true })
  editedAt?: Date;

  @Field(() => Boolean)
  isDeleted: boolean;
}