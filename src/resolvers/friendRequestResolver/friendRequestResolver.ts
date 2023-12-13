import {
  Arg,
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
import { FriendRequest } from "@generated/type-graphql/models";
import { RequestStatus } from "@generated/type-graphql/enums";
import { Context } from "../../context";
import { ApolloError } from "apollo-server-express";
import { UserResolver } from "../user/userResolver";

@Resolver(FriendRequest)
export class FriendRequestResolver {
  @Subscription({
    topics: "SEND_REQUEST",
    filter: ({
      args,
      payload,
    }: ResolverFilterData<
      { request: FriendRequest },
      { userId: number },
      Context
    >) => {
      return args.userId === payload.request.receiverId;
    },
  })
  sendRequestNotif(
    @Root("request") payload: FriendRequest,
    @Arg("userId") userId: number
  ): FriendRequest {
    return payload;
  }
  @Query(() => [FriendRequest])
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
      };
      const friendsRequest = await ctx.prisma.friendRequest.findMany(
        cursor ? { ...filters, cursor: { id: cursor }, skip: 1 } : filters
      );
      return friendsRequest;
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }
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
      });
      pubSub.publish("SEND_REQUEST", { request });
      return "friend request send succesfull";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Mutation(() => String)
  async handleFriendRequest(
    @Arg("friendRequestId") friendRequestId: number,
    @Arg("status") status: RequestStatus,
    @Ctx() ctx: Context
  ) {
    try {
      const request = await ctx.prisma.friendRequest.update({
        where: { id: friendRequestId },
        data: { status },
      });
      if (status === RequestStatus.ACCEPTED) {
        const user = new UserResolver();
        await user.addFriends(request.userId, request.receiverId, ctx);
      }
      return "friend request handle successfull";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }
}
