import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateChatInput {
  @Field(() => [String], { nullable: true, defaultValue: [] })
  participantIds: string[] = []; // Добавлено значение по умолчанию

  @Field({ nullable: true })
  title?: string;
}