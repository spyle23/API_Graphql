import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { Comment } from "@generated/type-graphql/models/Comment";
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
    @Ctx() ctx: Context
  ) {
    try {
      await ctx.prisma.comment.create({
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
      return "commentaire crée";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }
}
