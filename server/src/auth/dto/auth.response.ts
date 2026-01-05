import { ObjectType, Field } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity'; // Изменили путь

@ObjectType()
export class AuthResponse {
  @Field()
  accessToken: string;

  @Field({ nullable: true })
  refreshToken?: string;

  @Field(() => User)
  user: User;
}