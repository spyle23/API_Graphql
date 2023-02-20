import { NonEmptyArray } from "type-graphql";
import { CommentResolver } from "./commentResolver";
import { DiscussGroupResolver } from "./discussGroup";
import { MessageResolver } from "./messageResolver";
import { PostResolver } from "./postResolver";
import { UserResolver } from "./user/userResolver/userResolver";

export default [
  UserResolver,
  PostResolver,
  MessageResolver,
  DiscussGroupResolver,
  CommentResolver,
] as NonEmptyArray<Function> | NonEmptyArray<string>;
