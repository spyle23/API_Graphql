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
} from "./type";
import { authToken } from "../../../authToken";
import { RequestStatus } from "@generated/type-graphql/enums";

@Resolver(User)
export class UserResolver {
  @Subscription({
    topics: "STATUS",
    filter: async ({
      args,
      payload,
      context,
    }: ResolverFilterData<
      { userLogin: User },
      { userId: number },
      Context
    >) => {
      const friend = await context.prisma.friendRequest.findFirst({
        where: {
          status: RequestStatus.ACCEPTED,
          OR: [
            { userId: args.userId, receiverId: payload.userLogin.id },
            { userId: payload.userLogin.id, receiverId: args.userId },
          ],
        },
      });
      return friend ? true : false;
    },
  })
  getStatusUser(
    @Root("userLogin") payload: User,
    @Arg("userId") userId: number
  ): User {
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
  @Query(() => UserDetails)
  async profile(
    @Arg("profilId") profilId: number,
    @Arg("viewerId") viewerId: number,
    @Ctx() ctx: Context
  ) {
    try {
      const user = await ctx.prisma.user.findUnique({
        where: {
          id: profilId,
        },
      });
      const request = await ctx.prisma.friendRequest.findMany({
        where: {
          OR: [{ userId: profilId }, { receiverId: profilId }],
          status: RequestStatus.ACCEPTED,
        },
        include: {
          User: true,
          Receiver: true,
        },
        take: 10,
        orderBy: { updatedAt: "desc" },
      });
      const friends = request.map<User>((val) =>
        val.User.id !== profilId ? val.User : val.Receiver
      );
      const relation =
        profilId !== viewerId
          ? await ctx.prisma.friendRequest.findFirst({
              where: {
                OR: [
                  { userId: profilId, receiverId: viewerId },
                  { userId: viewerId, receiverId: profilId },
                ],
              },
            })
          : null;
      return {
        user,
        friends,
        relation,
      };
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
          status: true,
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
      const newUser = await ctx.prisma.user.update({
        where: { email },
        data: { status: true },
      });
      const token = authToken.sign(user);
      const response: LoginResponseForm = {
        message: "Vous êtes authentifié",
        success: true,
        data: {
          ...newUser,
          token,
        },
      };
      pubsub.publish("STATUS", { userLogin: newUser });
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
  async changeStatus(
    @Arg("userId") userId: number,
    @Arg("status") status: boolean,
    @PubSub() pubsub: PubSubEngine,
    @Ctx() ctx: Context
  ) {
    try {
      const user = await ctx.prisma.user.update({
        where: { id: userId },
        data: { status },
      });
      pubsub.publish("STATUS", { userLogin: user });
      return "status success";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }
}
