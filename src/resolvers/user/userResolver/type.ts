//@ts-nocheck
import { User, FriendRequest } from "@generated/type-graphql/models";
import { IsEmail } from "class-validator";
import { Field, InputType, ObjectType } from "type-graphql";
import { ResponseForm } from "../../../Types/ResponseForm";
@ObjectType({ description: "User with token" })
class UserWithToken extends User {
  @Field()
  token: string;
}

@InputType({ description: "user inputs" })
export class SignupInput implements Partial<User> {
  @Field()
  @IsEmail()
  email: string;

  @Field({ nullable: true })
  firstname?: string;

  @Field({ nullable: true })
  lastname?: string;

  @Field()
  password: string;

  @Field({ nullable: true })
  civilite?: string;
}
@ObjectType({ description: "Login response with token" })
export class LoginResponseForm extends ResponseForm<UserWithToken> {
  @Field()
  message: string;

  @Field()
  success: boolean;

  @Field(() => UserWithToken, { nullable: true })
  data?: UserWithToken;
}

@ObjectType({ description: "details of user" })
export class UserDetails {
  @Field(() => User)
  user: User;

  @Field(() => [User])
  friends: User[];

  @Field(() => FriendRequest, { nullable: true })
  relation: FriendRequest;
}

@InputType({ description: "input for update user" })
export class UpdateUserInput implements Partial<User> {
  @Field({ nullable: true })
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  firstname?: string;

  @Field({ nullable: true })
  lastname?: string;

  @Field({ nullable: true })
  civilite?: string;

  @Field({ nullable: true })
  photo?: string;
}
