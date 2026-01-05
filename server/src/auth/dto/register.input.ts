import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, MinLength, IsEnum } from 'class-validator';
import { UserRole } from '../../users/entities/user.entity'; // Изменили путь

@InputType()
export class RegisterInput {
  @Field()
  @IsNotEmpty()
  username: string;

  @Field()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Field()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @Field(() => UserRole, { nullable: true, defaultValue: UserRole.CLIENT })
  @IsEnum(UserRole)
  role?: UserRole;
}