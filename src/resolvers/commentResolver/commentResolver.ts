import {
  Arg,
  Args,
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
import { Comment } from "@generated/type-graphql/models/Comment";
import { Notification } from "@generated/type-graphql/models/Notification";
import { CommentInput, CommentResponse } from "./type";
import { Context } from "../../context";
import { ApolloError } from "apollo-server-express";

@Resolver(Comment)
export class CommentResolver {
  @Authorized()
  @Query(() => CommentResponse)
  async getCommentByPost(@Arg("postId") postId: number, @Ctx() ctx: Context) {
    try {
      const comments = await ctx.prisma.comment.findMany({
        where: {
          postId: postId,
        },
        include: {
          User: true,
          Post: true,
        },
      });
      const response: CommentResponse = {
        message: "Liste des commentaires pour le post",
        success: true,
        data: comments,
      };
      return response;
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Query(() => CommentResponse)
  async getCommentByUser(@Arg("userId") userId: number, @Ctx() ctx: Context) {
    try {
      const comments = await ctx.prisma.comment.findMany({
        where: {
          userId: userId,
        },
        include: {
          User: true,
          Post: true,
        },
      });
      const response: CommentResponse = {
        message: "liste des commentaires par l'utilisateur",
        success: true,
        data: comments,
      };
      return response;
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Mutation(() => String)
  async createComment(
    @Arg("userId") userId: number,
    @Arg("postId") postId: number,
    @Arg("commentInput") commentInput: CommentInput,
    @Ctx() ctx: Context,
    @PubSub() pubsub: PubSubEngine
  ) {
    try {
      const newComment = await ctx.prisma.comment.create({
        data: {
          ...commentInput,
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
      const post = await ctx.prisma.post.findUnique({
        where: {
          id: postId,
        },
      });
      if (post.userId !== userId) {
        const user = await ctx.prisma.user.findUnique({
          where: {
            id: userId,
          },
        });
        const notification = await ctx.prisma.notification.create({
          data: {
            name: "nouveau commentaire",
            description: `L'utilisateur ${user.firstname} ${user.lastname} a commenté votre publication`,
            User: {
              connect: {
                id: post.userId,
              },
            },
          },
        });
        await pubsub.publish("COMMENT_POST", notification);
      }
      return "commentaire crée";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Mutation(() => String)
  async modifyComment(
    @Arg("commendId") commentId: number,
    @Arg("userId") userId: number,
    @Arg("commentInput") commentInput: CommentInput,
    @Ctx() ctx: Context
  ) {
    try {
      const comment = await ctx.prisma.comment.findUnique({
        where: {
          id: commentId,
        },
      });
      if (!comment) return new ApolloError("commentaire innexistant");
      if (comment.userId === userId) {
        await ctx.prisma.comment.update({
          where: {
            id: commentId,
          },
          data: {
            ...commentInput,
            updatedAt: new Date(),
          },
        });
        return "Commentaire changé";
      }
      return new ApolloError(
        "Vous n'avez pas le droit de changer le commentaire des autres"
      );
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Mutation(() => String)
  async deleteComment(
    @Arg("userId") userId: number,
    @Arg("commentId") commentId: number,
    @Ctx() ctx: Context
  ) {
    try {
      const comment = await ctx.prisma.comment.findUnique({
        where: {
          id: commentId,
        },
      });
      if (!comment) return new ApolloError("Commentaire innexistant");
      if (comment.userId === userId) {
        await ctx.prisma.comment.delete({
          where: {
            id: commentId,
          },
        });
      }
      return new ApolloError(
        "Vous n'avez pas le droit de supprimer le commentaire des autres"
      );
    } catch (error) {}
  }

  @Subscription({
    topics: "COMMENT_POST",
    filter: async ({
      payload,
      args,
      context,
    }: ResolverFilterData<Notification, any, Context>) => {
      return payload.userId === args.userId;
    },
  })
  commentPost(
    @Root() payload: Notification,
    @Arg("userId") userId: number
  ): Notification {
    return payload;
  }
}
