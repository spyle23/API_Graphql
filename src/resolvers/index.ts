import { NonEmptyArray } from "type-graphql";
import { CommentResolver } from "./commentResolver";
import { DiscussGroupResolver } from "./discussGroup";
import { FileResolver } from "./file";
import { MessageResolver } from "./messageResolver";
import { PostResolver } from "./postResolver";
import { ReactionResolver } from "./ReactionResolver";
import { UserResolver } from "./user/userResolver/userResolver";
import { DiscussionResolver } from "./discussion";
import { FriendRequestResolver } from "./friendRequestResolver";
import { NotificationResolver } from "./notificationResolver";

export const resolvers = [
  UserResolver,
  PostResolver,
  MessageResolver,
  DiscussGroupResolver,
  DiscussionResolver,
  FriendRequestResolver,
  NotificationResolver,
  CommentResolver,
  FileResolver,
  DiscussGroupResolver,
  ReactionResolver,
] as NonEmptyArray<Function> | NonEmptyArray<string>;
