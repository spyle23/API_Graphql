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
import { Discussion } from "@generated/type-graphql/models/Discussion";
import { Context } from "../../context";
import { DiscussionExtend, DiscussionInput } from "./type";
import { ApolloError } from "apollo-server-express";

@Resolver(Discussion)
export class DiscussionResolver {
  @Subscription({
    topics: "LISTEN_THEME",
    filter: ({
      args,
      payload,
    }: ResolverFilterData<
      { params: DiscussionInput; discussion: DiscussionExtend },
      { userId: number }
    >) => {
      if (payload.params.receiverId) {
        return args.userId === payload.params.receiverId;
      }
      return payload.discussion.DiscussGroup.members.find(
        (i) => i.userId === args.userId
      )
        ? true
        : false;
    },
  })
  listenTheme(
    @Root("params") payload: DiscussionInput,
    @Root("discussion") discussion: DiscussionExtend,
    @Arg("userId") userId: number
  ): DiscussionExtend {
    return discussion;
  }
  @Authorized()
  @Query(() => [DiscussionExtend])
  async getDiscussionCurrentUser(
    @Arg("userId") userId: number,
    @Ctx() ctx: Context
  ) {
    try {
      const discussions = await ctx.prisma.discussion.findMany({
        where: {
          OR: [
            { userId },
            { receiverId: userId },
            { DiscussGroup: { members: { some: { userId } } } },
          ],
        },
        include: {
          User: true,
          Receiver: true,
          messages: {
            orderBy: {
              updatedAt: "desc",
            },
            include: {
              files: true,
              User: true,
            },
            take: 1,
          },
          DiscussGroup: {
            include: {
              members: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
      return discussions.filter((item) => item.messages.length === 1);
    } catch (error) {
      return new ApolloError("Une erreur s'est produite");
    }
  }

  @Authorized()
  @Mutation(() => Discussion)
  async changeTheme(
    @Arg("data") data: DiscussionInput,
    @Ctx() ctx: Context,
    @PubSub() pubub: PubSubEngine
  ) {
    try {
      const { id, theme } = data;
      const discussion = await ctx.prisma.discussion.update({
        data: { theme },
        where: { id },
        include: {
          User: true,
          Receiver: true,
          DiscussGroup: {
            include: {
              members: true,
            },
          },
          messages: {
            orderBy: { updatedAt: "desc" },
            take: 1,
            include: {
              files: true,
              User: true,
              DiscussGroup: true,
              Receiver: true,
            },
          },
        },
      });
      await pubub.publish("LISTEN_THEME", { params: data, discussion });
      return discussion;
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Mutation(() => Discussion)
  async createDiscussion(
    @Arg("userId") userId: number,
    @Arg("receiverId") receiverId: number,
    @Ctx() ctx: Context
  ) {
    try {
      const discussion = await ctx.prisma.discussion.findFirst({
        where: {
          OR: [
            { userId, receiverId },
            { receiverId: userId, userId: receiverId },
          ],
        },
      });
      return (
        discussion ??
        (await ctx.prisma.discussion.create({
          data: {
            User: { connect: { id: userId } },
            Receiver: { connect: { id: receiverId } },
          },
        }))
      );
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }
}
