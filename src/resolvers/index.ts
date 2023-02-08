import { NonEmptyArray } from "type-graphql";
import { MessageResolver } from "./messageResolver";
import { PostResolver } from "./postResolver";
import { UserResolver } from "./user/userResolver/userResolver";

export default [UserResolver, PostResolver, MessageResolver] as
  | NonEmptyArray<Function>
  | NonEmptyArray<string>;
