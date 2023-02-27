import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { Post } from "@generated/type-graphql/models/Post";
import { Context } from "../../context";
import { PostInput } from "./type";
import { ApolloError } from "apollo-server-express";
import { uploadFile } from "../../upload";

@Resolver(Post)
export class PostResolver {
  @Authorized()
  @Query(() => [Post])
  async postByUser(@Arg("userId") userId: number, @Ctx() ctx: Context) {
    try {
      const posts = await ctx.prisma.post.findMany({
        where: {
          userId: userId,
        },
      });
      return posts;
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Mutation(() => String)
  async createPost(
    @Arg("data") data: PostInput,
    @Arg("userId") userId: number,
    @Ctx() ctx: Context
  ) {
    try {
      await ctx.prisma.post.create({
        data: {
          ...data,
          user: {
            connect: {
              id: userId,
            },
          },
        },
      });
      return "post crée";
    } catch (error) {
      return new ApolloError("post non");
    }
  }
}
