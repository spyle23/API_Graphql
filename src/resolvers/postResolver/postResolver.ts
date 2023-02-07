import { Arg, Ctx, Mutation, Resolver } from "type-graphql";
import { Post } from "@generated/type-graphql/models/Post";
import { Context } from "../../context";
import { PostInput } from "./type";
import { ApolloError } from "apollo-server-express";

@Resolver(Post)
export class PostResolver {
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
      return "post crée"
    } catch (error) {
      return new ApolloError("post non")
    }
  }
}
