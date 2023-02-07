import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { User } from "@generated/type-graphql/models/User";
import { Context } from "../../../context";
import { ApolloError } from "apollo-server-express";
import Bcrypt from "bcryptjs";
import { SignupInput } from "./type";

@Resolver(User)
export class UserResolver {
  @Query(() => User, { nullable: true })
  async profile(@Arg("userId") userId: number, @Ctx() ctx: Context) {
    try {
      const user = await ctx.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });
      return user;
    } catch (error) {
      return new ApolloError("Une erreur s'est produite");
    }
  }

  @Mutation(() => String)
  async signup(@Arg("userInput") userInput: SignupInput, @Ctx() ctx: Context) {
    try {
      const { email, password } = userInput;
      const user = await ctx.prisma.user.findUnique({
        where: {
          email: email,
        },
      });
      if (user) {
        return new ApolloError("L'email que vous avez entrer est déjà pris");
      }
      const hashpasswd = Bcrypt.hashSync(password, 10);
      await ctx.prisma.user.create({
        data: {
          ...userInput,
          password: hashpasswd,
        },
      });
      return "Vous êtes inscris";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }
}
