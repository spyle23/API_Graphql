//@ts-nocheck
import { Comment, Reaction, User } from "@generated/type-graphql/models";
import { Post } from "@generated/type-graphql/models/Post";
import { IsString, Length } from "class-validator";
import { Field, InputType, ObjectType } from "type-graphql";

@InputType({ description: "inputs for post" })
export class PostInput implements Partial<Post> {
  @Field()
  @IsString()
  @Length(1, 500)
  description: string;

  @Field({ nullable: true })
  image?: string;
}

@ObjectType({ description: "Form of post to display" })
export class PostDisplay extends Post {
  @Field(() => User)
  user: User;

  @Field(() => [Comment], { nullable: true })
  comments?: Comment[];

  @Field(() => [Reaction], { nullable: true })
  reactions?: Reaction[];
}
