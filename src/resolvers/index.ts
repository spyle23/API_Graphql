import { NonEmptyArray } from "type-graphql";
import { UserResolver } from "./user/userResolver/userResolver";

export default [UserResolver] as
  | NonEmptyArray<Function>
  | NonEmptyArray<string>;
