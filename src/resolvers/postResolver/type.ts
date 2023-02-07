import { Post } from "@generated/type-graphql/models/Post";
import { IsString, Length, MaxLength } from "class-validator";
import { Field, InputType } from "type-graphql";

@InputType({ description: "inputs for post" })
export class PostInput implements Partial<Post> {
  @Field()
  @IsString()
  @MaxLength(30)
  title: string;

  @Field()
  @IsString()
  @Length(10, 500)
  description: string;

  @Field({ nullable: true })
  image?: string;
}
