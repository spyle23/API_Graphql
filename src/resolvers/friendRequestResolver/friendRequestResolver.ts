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
import { FriendRequest, User } from "@generated/type-graphql/models";
import { RequestStatus } from "@generated/type-graphql/enums";
import { Context } from "../../context";
import { ApolloError } from "apollo-server-express";
import { FriendRequestExtend } from "./type";

const findDuplicates = <T extends { id: number }>(arr: T[]) => {
  const seen: Record<number, boolean> = {};
  const duplicates: T[] = [];

  for (const obj of arr) {
    if (seen[obj.id]) {
      duplicates.push(obj);
    } else {
      seen[obj.id] = true;
    }
  }

  return duplicates;
};

@Resolver(FriendRequest)
export class FriendRequestResolver {
  @Subscription({
    topics: "SEND_REQUEST",
    filter: ({
      args,
      payload,
    }: ResolverFilterData<
      { request: FriendRequestExtend },
      { userId: number },
      Context
    >) => {
      return args.userId === payload.request.receiverId;
    },
  })
  sendRequestNotif(
    @Root("request") payload: FriendRequestExtend,
    @Arg("userId") userId: number
  ): FriendRequestExtend {
    return payload;
  }
  @Authorized()
  @Query(() => [FriendRequestExtend])
  async getRequest(
    @Arg("userId") userId: number,
    @Arg("cursor", { nullable: true }) cursor: number,
    @Arg("limit", { defaultValue: 10 }) limit: number,
    @Ctx() ctx: Context
  ) {
    try {
      const filters: any = {
        where: { receiverId: userId, status: RequestStatus.PENDING },
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          User: true,
        },
      };
      const friendsRequest = await ctx.prisma.friendRequest.findMany(
        cursor ? { ...filters, cursor: { id: cursor }, skip: 1 } : filters
      );
      return friendsRequest;
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Query(() => [User])
  async getFriendOfCurrentUser(
    @Arg("userId") userId: number,
    @Arg("cursor", { nullable: true }) cursor: number,
    @Arg("status", { nullable: true }) status: boolean,
    @Arg("limit", { defaultValue: 10 }) limit: number,
    @Ctx() ctx: Context
  ) {
    try {
      const filters: any = {
        where: {
          OR: [{ userId }, { receiverId: userId }],
          status: RequestStatus.ACCEPTED,
        },
        include: {
          User: true,
          Receiver: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: limit,
      };
      const request = (await ctx.prisma.friendRequest.findMany(
        cursor ? { ...filters, cursor: { id: cursor }, skip: 1 } : filters
      )) as (FriendRequest & { User: User; Receiver: User })[];
      const friends = request.map<User>((val) =>
        val.User.id !== userId ? val.User : val.Receiver
      );
      return status ? friends.filter((i) => i.status) : friends;
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Query(() => [User])
  async getCommonFriends(
    @Arg("userId") userId: number,
    @Arg("receiverId") receiverId: number,
    @Arg("cursor", { nullable: true }) cursor: number,
    @Arg("limit", { defaultValue: 10 }) limit: number,
    @Ctx() ctx: Context
  ) {
    try {
      const filters: any = {
        where: {
          status: RequestStatus.ACCEPTED,
          OR: [
            { userId, receiverId: { not: receiverId } },
            { receiverId: userId, userId: { not: receiverId } },
            { userId: receiverId, receiverId: { not: userId } },
            { userId: { not: userId }, receiverId },
          ],
        },
        include: {
          User: true,
          Receiver: true,
        },
        take: limit,
      };
      const friendsOfBoth = (await ctx.prisma.friendRequest.findMany(
        cursor ? { ...filters, cursor: { id: cursor }, skip: 1 } : filters
      )) as (FriendRequest & { User: User; Receiver: User })[];
      const friends = friendsOfBoth.map((i) =>
        [userId, receiverId].includes(i.userId) ? i.Receiver : i.User
      );
      const finalCommon = findDuplicates(friends);
      return finalCommon;
    } catch (error) {
      return new ApolloError("une Erreur s'est produite");
    }
  }

  @Authorized()
  @Query(() => [User])
  async getSuggestionOfCurrentUser(
    @Arg("userId") userId: number,
    @Arg("cursor", { nullable: true }) cursor: number,
    @Arg("limit", { defaultValue: 10 }) limit: number,
    @Ctx() ctx: Context
  ) {
    try {
      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        include: {
          friendRequest: {
            where: {
              OR: [
                { status: RequestStatus.ACCEPTED },
                { status: RequestStatus.PENDING },
              ],
            },
          },
          request: {
            where: {
              OR: [
                { status: RequestStatus.ACCEPTED },
                { status: RequestStatus.PENDING },
              ],
            },
          },
        },
      });
      const friendRequestId = user.friendRequest.map((i) => i.userId);
      const requestId = user.request.map((i) => i.receiverId);
      const friendsId = [...friendRequestId, ...requestId];
      const filters: any = {
        where: {
          id: { notIn: [userId, ...friendsId] },
        },
        take: limit,
      };
      const request = await ctx.prisma.user.findMany(
        cursor ? { ...filters, cursor: { id: cursor }, skip: 1 } : filters
      );
      return request;
    } catch (error) {
      return new ApolloError("une Erreur s'est produite");
    }
  }
  @Authorized()
  @Mutation(() => String)
  async sendFriendRequest(
    @Arg("userId") userId: number,
    @Arg("receiverId") receiverId: number,
    @PubSub() pubSub: PubSubEngine,
    @Ctx() ctx: Context
  ) {
    try {
      const request = await ctx.prisma.friendRequest.create({
        data: {
          User: { connect: { id: userId } },
          Receiver: { connect: { id: receiverId } },
          status: RequestStatus.PENDING,
        },
        include: {
          User: true,
        },
      });
      pubSub.publish("SEND_REQUEST", { request });
      return "friend request send succesfull";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Mutation(() => String)
  async handleFriendRequest(
    @Arg("friendRequestId") friendRequestId: number,
    @Arg("status") status: RequestStatus,
    @PubSub() pubSub: PubSubEngine,
    @Ctx() ctx: Context
  ) {
    try {
      const request = await ctx.prisma.friendRequest.update({
        where: { id: friendRequestId },
        data: { status },
        include: {
          Receiver: true,
        },
      });
      if (status === RequestStatus.ACCEPTED) {
        const notification = await ctx.prisma.notification.create({
          data: {
            name: "invitation",
            description: `${request.Receiver.firstname} ${request.Receiver.lastname} a confirmé votre invitation`,
            User: {
              connect: {
                id: friendRequestId,
              },
            },
          },
        });
        await pubSub.publish("NOTIFICATION", notification);
      }
      return "friend request handle successfull";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Mutation(() => String)
  async deleteFriend(
    @Arg("userId") userId: number,
    @Arg("receiverId") receiverId: number,
    @Ctx() ctx: Context
  ) {
    try {
      await ctx.prisma.friendRequest.deleteMany({
        where: { userId, receiverId },
      });
      return "friend deleted";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }
}
