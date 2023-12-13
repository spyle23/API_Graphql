import {
  Arg,
  Authorized,
  Ctx,
  Mutation,
  PubSub,
  PubSubEngine,
  Query,
  Resolver,
  ResolverFilterData,
  Root,
  Subscription,
} from "type-graphql";
import { User } from "@generated/type-graphql/models/User";
import { Context } from "../../../context";
import { ApolloError } from "apollo-server-express";
import Bcrypt from "bcryptjs";
import {
  LoginResponseForm,
  SignupInput,
  UpdateUserInput,
  UserDetails,
  UserWithStatus,
} from "./type";
import { authToken } from "../../../authToken";

@Resolver(User)
export class UserResolver {
  @Subscription({
    topics: "STATUS",
    filter: async ({
      args,
      payload,
      context,
    }: ResolverFilterData<
      { userLogin: UserWithStatus },
      { userId: number },
      Context
    >) => {
      const friend = await context.prisma.user.findFirst({
        where: {
          id: args.userId,
          friends: { some: { id: payload.userLogin.id } },
        },
      });
      return friend ? true : false;
    },
  })
  getStatusUser(
    @Root("userLogin") payload: UserWithStatus,
    @Arg("userId") userId: number
  ): UserWithStatus {
    return payload;
  }
  @Authorized()
  @Query(() => [User])
  async allUser(@Ctx() ctx: Context) {
    try {
      const users = ctx.prisma.user.findMany();
      return users;
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Query(() => [User])
  async getFriends(
    @Arg("userId") userId: number,
    @Arg("limit", { defaultValue: 10 }) limit: number,
    @Ctx() ctx: Context,
    @Arg("cursor", { nullable: true }) cursor: number
  ) {
    try {
      const filters: any = {
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: limit,
      };
      const friends = await ctx.prisma.user.findMany(
        cursor ? { ...filters, cursor: { id: cursor }, skip: 1 } : filters
      );
      return friends;
    } catch (error) {
      return new ApolloError("une Erreur s'est produite");
    }
  }

  @Authorized()
  @Query(() => UserDetails, { nullable: true })
  async profile(@Arg("userId") userId: number, @Ctx() ctx: Context) {
    try {
      const user = await ctx.prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          Post: true,
          notifications: true,
          friends: true,
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
      console.log(error);
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Mutation(() => LoginResponseForm)
  async login(
    @Arg("email") email: string,
    @Arg("password") password: string,
    @PubSub() pubsub: PubSubEngine,
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
      pubsub.publish("STATUS", { userLogin: { ...user, status: true } });
      return response;
    } catch (error) {
      console.log(error);
      return new ApolloError(JSON.stringify(error));
    }
  }

  @Authorized()
  @Mutation(() => String)
  async updateUser(
    @Arg("userId") userId: number,
    @Arg("updateUserInput") updateUserInput: UpdateUserInput,
    @Ctx() ctx: Context
  ) {
    try {
      await ctx.prisma.user.update({
        where: {
          id: userId,
        },
        data: updateUserInput,
      });
      return "Information mis à jour";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Mutation(() => String)
  async addFriends(
    @Arg("userId") userId: number,
    @Arg("friendId") friendId: number,
    @Ctx() ctx: Context
  ) {
    try {
      await ctx.prisma.user.update({
        where: { id: userId },
        data: { User: { connect: { id: friendId } } },
      });
      await ctx.prisma.user.update({
        where: { id: friendId },
        data: { User: { connect: { id: userId } } },
      });
      return "add friend success";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Mutation(() => String)
  async deleteFriends(
    @Arg("userId") userId: number,
    @Arg("friendId") friendId: number,
    @Ctx() ctx: Context
  ) {
    try {
      await ctx.prisma.user.update({
        where: { id: userId },
        data: { friends: { delete: { id: friendId } } },
      });
      return "delete friend success";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }
}
