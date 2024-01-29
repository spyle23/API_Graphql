import { Arg, Authorized, Ctx, Query, Resolver } from "type-graphql";
import { Notification } from "@generated/type-graphql/models";
import { ApolloError } from "apollo-server-express";
import { Context } from "../../context";

@Resolver(Notification)
export class NotificationResolver {
  @Authorized()
  @Query(() => [Notification])
  async getNotifications(
    @Arg("userId") userId: number,
    @Arg("cursor", { nullable: true }) cursor: number,
    @Arg("limit", { defaultValue: 10 }) limit: number,
    @Ctx() ctx: Context
  ) {
    try {
      const filter: any = {
        where: { userId },
        take: limit,
      };
      const notifications = await ctx.prisma.notification.findMany(
        cursor ? { ...filter, cursor: { id: cursor } } : filter
      );
      return notifications;
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }
}
