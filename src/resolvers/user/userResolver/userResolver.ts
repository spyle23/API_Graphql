import { Query, Resolver } from "type-graphql";
import { User } from "@generated/type-graphql/models/User";

@Resolver(User)
export class UserResolver {
  @Query(() => String)
  async getMessage() {
    return "bonjour";
  }
}
