import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from "type-graphql";
import {
  Post,
  FileExt,
  Comment,
  User,
  Reaction,
} from "@generated/type-graphql/models";
import { Context } from "../../context";
import { PostDisplay, PostInput } from "./type";
import { ApolloError } from "apollo-server-express";

@Resolver(Post)
export class PostResolver {
  @Authorized()
  @Query(() => [PostDisplay])
  async postByUser(
    @Arg("userId") userId: number,
    @Arg("cursor", { nullable: true }) cursor: number,
    @Arg("limit", { defaultValue: 10 }) limit: number,
    @Ctx() ctx: Context
  ) {
    try {
      const filters: any = {
        where: {
          userId: userId,
        },
        include: {
          files: true,
          comments: true,
          user: true,
          reactions: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
      };
      const posts = (await ctx.prisma.post.findMany(
        cursor ? { ...filters, cursor: { id: cursor }, skip: 1 } : filters
      )) as (Post & {
        files: FileExt[];
        comments: Comment[];
        user: User;
        reaction: Reaction[];
      })[];
      const modifiedPost = posts.map((i) => ({
        ...i,
        nbComments: i.comments.length,
      }));
      return modifiedPost;
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
        files: true,
        comments: true,
        user: true,
        reactions: true,
      },
    };
    try {
      const post = (await ctx.prisma.post.findMany(
        cursor ? { ...filters, cursor: { id: cursor }, skip: 1 } : filters
      )) as (Post & {
        files: FileExt[];
        comments: Comment[];
        user: User;
        reaction: Reaction[];
      })[];
      const modifiedPost = post.map((i) => ({
        ...i,
        nbComments: i.comments.length,
      }));
      return modifiedPost;
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
    @Arg("groupId", { nullable: true }) groupId: number,
    @Ctx() ctx: Context
  ) {
    try {
      const { files, description } = data;
      const input = {
        description,
        files: {
          createMany: {
            data: files,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
      };
      const post = await ctx.prisma.post.create({
        data: groupId
          ? { ...input, Group: { connect: { id: groupId } } }
          : input,
      });

      return "post crée";
    } catch (error) {
      return new ApolloError(error);
    }
  }
}
