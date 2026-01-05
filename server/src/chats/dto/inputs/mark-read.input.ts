import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class MarkReadInput {
  @Field(() => [String])
  messageIds: string[];
}