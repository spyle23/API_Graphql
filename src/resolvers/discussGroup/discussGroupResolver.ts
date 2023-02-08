import { Arg, Ctx, Mutation, Resolver } from "type-graphql";
import { DiscussGroup } from "@generated/type-graphql/models/DiscussGroup";
import { User } from "@generated/type-graphql/models/User";
import { Context } from "../../context";
import { ApolloError } from "apollo-server-express";
import { DiscussGroupInput, UserChoose } from "./type";

@Resolver(DiscussGroup)
export class DiscussGroupResolver {
  @Mutation(() => DiscussGroup)
  async createDiscussGroup(
    @Arg("data") data: DiscussGroupInput,
    @Arg("userChoose") userChoose: UserChoose,
    @Ctx() ctx: Context
  ) {
    try {
      const group = await ctx.prisma.discussGroup.create({
        data,
      });
      for (let user of userChoose.membresId) {
        await ctx.prisma.user.update({
          where: {
            id: user,
          },
          data: {
            groupes: {
              create: [
                {
                  DiscussGroup: {
                    connect: {
                      id: group.id,
                    },
                  },
                },
              ],
            },
          },
        });
      }
      return group;
    } catch (error) {
      console.log(error);
      return new ApolloError("une erreur s'est produite");
    }
  }
}
