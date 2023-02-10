import { AuthChecker } from "type-graphql";
import { authToken } from "./authToken";
import { Context } from "./context";
import { User } from "@generated/type-graphql/models/User";

export const customAuthChecker: AuthChecker<Context> = async ({
  context,
}): Promise<boolean> => {
  const { token } = context;
  const user = await authToken.verify<User>(token);
  return user ? true : false;
};
