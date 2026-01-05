import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class SendMessageInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  chatId: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  content: string;
}