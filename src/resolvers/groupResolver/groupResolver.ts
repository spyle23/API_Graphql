import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { Group, FileExt } from "@generated/type-graphql/models";
import { Context } from "../../context";
import { ApolloError } from "apollo-server-express";
import { PostDisplay } from "../postResolver/type";

@Resolver(Group)
export class GroupResolver {
  @Query(() => [Group])
  async getGroupByUser(
    @Arg("userId") userId: number,
    @Arg("cursor", { nullable: true }) cursor: number,
    @Arg("limit", { defaultValue: 10 }) limit: number,
    @Ctx() ctx: Context
  ) {
    try {
      const filters: any = {
        where: { UserGroup: { every: { userId } } },
        take: limit,
        orderBy: {
          updatedAt: "desc",
        },
      };
      const groups = await ctx.prisma.group.findMany(
        cursor ? { ...filters, cursor: { id: cursor }, skip: 1 } : filters
      );
      return groups;
    } catch (error) {
      console.log(error);
      return new ApolloError("Une erreur s'est produite");
    }
  }
  @Query(() => [PostDisplay])
  async getGroupPublications(
    @Arg("groupId") groupId: number,
    @Arg("cursor", { nullable: true }) cursor: number,
    @Arg("limit", { defaultValue: 10 }) limit: number,
    @Ctx() ctx: Context
  ) {
    try {
      const filters: any = {
        where: { groupId },
        take: limit,
        include: {
          user: true,
          files: true,
          reactions: true,
          comments: { select: { _count: true } },
        },
      };
      const publications = await ctx.prisma.post.findMany(
        cursor ? { ...filters, cursor: { id: cursor }, skip: 1 } : filters
      );
      return publications;
    } catch (error) {
      return new ApolloError("Une erreur s'est produite");
    }
  }

  @Query(() => [FileExt])
  async getMultimedia(
    @Arg("groupId") groupId: number,
    @Arg("cursor", { nullable: true }) cursor: number,
    @Arg("limit", { defaultValue: 10 }) limit: number,
    @Ctx() ctx: Context
  ) {
    try {
      const filters: any = {
        where: {
          groupId,
          extension: {
            in: [
              "image/png",
              "image/jpg",
              "image/jpeg",
              "image/webp",
              "video/mp4",
              "video/avi",
            ],
          },
        },
        take: limit,
        orderBy: {
          updatedAt: "desc",
        },
      };
      const images = await ctx.prisma.fileExt.findMany(
        cursor ? { ...filters, cursor: { id: cursor }, skip: 1 } : filters
      );
      return images;
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Query()
  async getFiles(
    @Arg("groupId") groupId: number,
    @Arg("cursor") cursor: number,
    @Arg("limit") limit: number,
    @Ctx() ctx: Context
  ) {
    try {
      const filters: any = {
        where: {
          groupId,
          extension: {
            notIn: [
              "image/png",
              "image/jpg",
              "image/jpeg",
              "image/webp",
              "video/mp4",
              "video/avi",
            ],
          },
        },
        take: limit,
        orderBy: {
          updatedAt: "desc",
        },
      };
      const files = await ctx.prisma.fileExt.findMany(
        cursor ? { ...filters, cursor: { id: cursor }, skip: 1 } : filters
      );
      return files;
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Mutation()
  async changeParams(){
    
  }
}
