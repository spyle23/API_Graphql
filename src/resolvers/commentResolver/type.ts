//@ts-nocheck
import { Comment } from "@generated/type-graphql/models/Comment";
import { Post } from "@generated/type-graphql/models/Post";
import { User } from "@generated/type-graphql/models/User";
import { IsString } from "class-validator";
import { Field, InputType, ObjectType } from "type-graphql";
import { ResponseForm } from "../../Types/ResponseForm";
import { FileInput } from "../postResolver/type";
import { FileExt } from "@generated/type-graphql/models";

@InputType({ description: "input for the comment" })
export class CommentInput implements Partial<Comment> {
  @IsString()
  @Field()
  content: string;

  @Field(() => [FileInput])
  files: FileInput[];
}

@ObjectType({ description: "comment with user" })
export class CommentWithUser extends Comment {
  @Field(() => User)
  User: User;

  @Field(() => Post)
  Post?: Post;

  @Field(() => [FileExt])
  files?: FileExt[];
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
