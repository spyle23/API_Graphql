import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { DiscussGroup } from "@generated/type-graphql/models/DiscussGroup";
import { User } from "@generated/type-graphql/models/User";
import { Context } from "../../context";
import { ApolloError } from "apollo-server-express";
import { DiscussGroupInput, UserChoose, UserWithGroup } from "./type";

@Resolver(DiscussGroup)
export class DiscussGroupResolver {
  @Mutation(() => DiscussGroup)
  async createDiscussGroup(
    @Arg("data") data: DiscussGroupInput,
    @Arg("userChoose") userChoose: UserChoose,
    @Arg("userId") userId: number,
    @Ctx() ctx: Context
  ) {
    try {
      const discussion = await ctx.prisma.discussion.create({
        data: { User: { connect: { id: userId } } },
      });
      const group = await ctx.prisma.discussGroup.create({
        data: {
          ...data,
          Discussion: {
            connect: {
              id: discussion.id,
            },
          },
          members: {
            create: userChoose.membresId.map((value) => ({
              User: { connect: { id: value } },
            })),
          },
        },
      });
      return group;
    } catch (error) {
      console.log(error);
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Query(() => [DiscussGroup])
  async getAllGroupUser(@Arg("userId") userId: number, @Ctx() ctx: Context) {
    try {
      const user = await ctx.prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          groupes: true,
        },
      });
      let userDiscussGroup: DiscussGroup[] = [];
      for (let group of user?.groupes) {
        const currentGroup = await ctx.prisma.discussGroup.findUnique({
          where: {
            id: group.discussGroupId,
          },
        });
        userDiscussGroup.push(currentGroup);
      }
      return userDiscussGroup;
    } catch (error) {
      return new ApolloError("une erreur s'est produitef");
    }
  }
}
