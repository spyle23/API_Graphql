import { User } from "@generated/type-graphql/models/User";
import { IsEmail } from "class-validator";
import { Field, InputType } from "type-graphql";

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
