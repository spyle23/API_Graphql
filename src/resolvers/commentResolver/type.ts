import { Comment } from "@generated/type-graphql/models/Comment";
import { Post } from "@generated/type-graphql/models/Post";
import { User } from "@generated/type-graphql/models/User";
import { IsString } from "class-validator";
import { Field, InputType, ObjectType } from "type-graphql";
import { ResponseForm } from "../../Types/ResponseForm";

@InputType({ description: "input for the comment" })
export class CommentInput implements Partial<Comment> {
  @IsString()
  @Field()
  content: string;

  @Field({ nullable: true })
  image?: string;
}

@ObjectType({ description: "comment with user" })
export class CommentWithUser extends Comment {
  @Field(() => User)
  User: User;

  @Field(() => Post)
  Post?: Post;
}

@ObjectType({ description: "response type for comment" })
export class CommentResponse extends ResponseForm<CommentWithUser[]> {
  @Field()
  message: string;

  @Field()
  success: boolean;

  @Field(() => [CommentWithUser], { nullable: true })
  data?: CommentWithUser[];
}
