import { User } from "@generated/type-graphql/models/User";
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
