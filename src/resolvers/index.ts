import { NonEmptyArray } from "type-graphql";
import { PostResolver } from "./postResolver";
import { UserResolver } from "./user/userResolver/userResolver";

export default [UserResolver, PostResolver] as
  | NonEmptyArray<Function>
  | NonEmptyArray<string>;
