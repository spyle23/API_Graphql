import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { Post } from "@generated/type-graphql/models/Post";
import { Context } from "../../context";
import { PostDisplay, PostInput } from "./type";
import { ApolloError } from "apollo-server-express";

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
  @Query(() => [PostDisplay])
  async getOrderPost(
    @Ctx() ctx: Context,
    @Arg("limit", { defaultValue: 10 }) limit: number,
    @Arg("cursor", { nullable: true }) cursor: number
  ) {
    const filters: any = {
      orderBy: {
        updatedAt: "desc",
      },
      take: limit,
      include: {
        comments: true,
        user: true,
        reactions: true,
      },
    };
    try {
      const post = await ctx.prisma.post.findMany(
        cursor ? { ...filters, cursor: { id: cursor }, skip: 1 } : filters
      );
      return post;
    } catch (error) {
      console.log("error", error);
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
