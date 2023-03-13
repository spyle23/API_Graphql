import { Reaction } from "@generated/type-graphql/models/Reaction";
import { ApolloError } from "apollo-server-express";
import {
  Arg,
  Ctx,
  Mutation,
  PubSub,
  PubSubEngine,
  Resolver,
} from "type-graphql";
import { Context } from "../../context";
import { ReactionInput } from "./type";

@Resolver(Reaction)
export class ReactionResolver {
  @Mutation(() => String)
  async addReaction(
    @Arg("postId") postId: number,
    @Arg("userId") userId: number,
    @Arg("reactionType") reactionType: ReactionInput,
    @Ctx() ctx: Context,
    @PubSub() pubsub: PubSubEngine
  ) {
    try {
      const post = await ctx.prisma.post.findUnique({
        where: {
          id: postId,
        },
        include: {
          reactions: true,
        },
      });
      const reaction = post?.reactions.find(
        (react) =>
          react.userId === userId &&
          react.reactionType === reactionType.reactionType
      );
      if (reaction?.id) {
        await ctx.prisma.reaction.delete({
          where: {
            id: reaction.id,
          },
        });
        return "react is presented";
      }
      await ctx.prisma.reaction.create({
        data: {
          reactionType: reactionType.reactionType,
          User: {
            connect: {
              id: userId,
            },
          },
          Post: {
            connect: {
              id: postId,
            },
          },
        },
      });
      if (post.userId !== userId) {
        const user = await ctx.prisma.user.findUnique({
          where: {
            id: post.userId,
          },
        });
        const notification = await ctx.prisma.notification.create({
          data: {
            name: "nouvelle reaction",
            description: `${user.firstname} ${user.lastname} a réagit à votre publication`,
            User: {
              connect: {
                id: post.userId,
              },
            },
          },
        });
        await pubsub.publish("NOTIFICATION", notification);
      }
      return "react add";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }
}
