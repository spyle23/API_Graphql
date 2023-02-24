import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { User } from "@generated/type-graphql/models/User";
import { Context } from "../../../context";
import { ApolloError } from "apollo-server-express";
import Bcrypt from "bcryptjs";
import { LoginResponseForm, SignupInput } from "./type";
import { authToken } from "../../../authToken";

@Resolver(User)
export class UserResolver {
  @Authorized()
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

  @Mutation(() => LoginResponseForm)
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
      const newUser = await ctx.prisma.user.create({
        data: {
          ...userInput,
          password: hashpasswd,
        },
      });
      const token = authToken.sign(newUser);
      const response: LoginResponseForm = {
        message: "Vous êtes inscris",
        success: true,
        data: {
          ...newUser,
          token,
        },
      };
      return response;
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Mutation(() => LoginResponseForm)
  async login(
    @Arg("email") email: string,
    @Arg("password") password: string,
    @Ctx() ctx: Context
  ) {
    try {
      if (!email || !password)
        return new ApolloError(
          !password ? "le mot de passe est requis" : "l'email est requis"
        );
      const user = await ctx.prisma.user.findUnique({
        where: {
          email: email,
        },
      });
      if (!user)
        return new ApolloError(
          "L'email que vous avez entré ne correspond à aucun compte"
        );
      const isValid = Bcrypt.compareSync(password, user.password);
      if (!isValid)
        return new ApolloError(
          "Le mot de passe que vous avez entré est incorrect"
        );
      const token = authToken.sign(user);
      const response: LoginResponseForm = {
        message: "Vous êtes authentifié",
        success: true,
        data: {
          ...user,
          token,
        },
      };
      return response;
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }
}
