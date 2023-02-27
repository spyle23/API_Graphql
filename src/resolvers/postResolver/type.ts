import { Post } from "@generated/type-graphql/models/Post";
import { IsBase64, IsString, Length, MaxLength } from "class-validator";
import { Field, InputType } from "type-graphql";

@InputType({ description: "inputs for post" })
export class PostInput implements Partial<Post> {
  @Field()
  @IsString()
  @Length(1, 500)
  description: string;

  @Field({ nullable: true })
  image?: string;
}
