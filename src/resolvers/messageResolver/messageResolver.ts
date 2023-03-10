import {
  Arg,
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
import { Message } from "@generated/type-graphql/models/Message";
import { Context } from "../../context";
import { MessageInput, MessageResponse } from "./type";
import { ApolloError } from "apollo-server-express";

@Resolver(Message)
export class MessageResolver {
  @Subscription({
    topics: "SEND_MESSAGE",
    filter: async ({
      payload,
      args,
      context,
    }: ResolverFilterData<any, any, Context>) => {
      const currentUser = await context.prisma.user.findUnique({
        where: { id: args.userId },
        include: { groupes: true },
      });
      if (payload.message.discussGroupId) {
        return currentUser.groupes.find(
          ({ discussGroupId }) =>
            discussGroupId === payload.message.discussGroupId
        )
          ? true
          : false;
      }
      return payload.message.receiverId === args.userId;
    },
  })
  messageToUser(
    @Root("message") payload: Message,
    @Arg("userId") userId: number
  ): Message {
    return payload;
  }

  @Authorized()
  @Mutation(() => MessageResponse)
  async sendMessageDiscoussGroup(
    @Arg("messageInput") messageInput: MessageInput,
    @Arg("userId") userId: number,
    @Arg("receiverId", { nullable: true }) receiverId: number,
    @Arg("discussGroupId", { nullable: true }) discussGroupId: number,
    @PubSub() pubSub: PubSubEngine,
    @Ctx() ctx: Context
  ) {
    try {
      const dataMessage = receiverId
        ? {
            ...messageInput,
            receiverId,
            User: {
              connect: {
                id: userId,
              },
            },
          }
        : {
            ...messageInput,
            User: {
              connect: {
                id: userId,
              },
            },
            DiscussGroup: {
              connect: {
                id: discussGroupId,
              },
            },
          };
      if (receiverId) {
        const receiver = await ctx.prisma.user.findUnique({
          where: {
            id: receiverId,
          },
        });
        if (!receiver)
          return new ApolloError("Le recepteur du message n'existe pas");
      }
      const message = await ctx.prisma.message.create({
        data: {
          ...dataMessage,
        },
      });
      if (message) {
        await pubSub.publish("SEND_MESSAGE", {
          message: message,
        });
        return {
          message: "message envoy??",
          success: true,
        } as MessageResponse;
      }
    } catch (error) {
      return new ApolloError("Une erreur s'est produite");
    }
  }
  @Authorized()
  @Query(() => MessageResponse)
  async messageTwoUser(
    @Arg("userId") userId: number,
    @Arg("receiverId", { nullable: true }) receiverId: number,
    @Arg("discussGroupId", { nullable: true }) discussGroupId: number,
    @Ctx() ctx: Context
  ) {
    try {
      if (receiverId) {
        const messagesByUserId = await ctx.prisma.message.findMany({
          where: {
            userId: userId,
            receiverId: receiverId,
          },
        });
        const messageByReceiverId = await ctx.prisma.message.findMany({
          where: {
            userId: receiverId,
            receiverId: userId,
          },
        });
        const response: MessageResponse = {
          message: "voici les messages",
          data: [...messageByReceiverId, ...messagesByUserId],
          success: true,
        };
        return response;
      }
      const messagesGroup = await ctx.prisma.message.findMany({
        where: {
          discussGroupId: discussGroupId,
        },
      });
      const response: MessageResponse = {
        message: "voici les messages du groupe",
        data: messagesGroup,
        success: true,
      };
      return response;
    } catch (error) {
      console.log(error);
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Mutation(() => String)
  async deleteMessageById(
    @Arg("messageId") messageId: number,
    @Arg("userId") userId: number,
    @Ctx() ctx: Context
  ) {
    try {
      const message = await ctx.prisma.message.findUnique({
        where: {
          id: messageId,
        },
      });
      if (!message) return new ApolloError("message non existant");
      if (message.userId === userId) {
        await ctx.prisma.message.delete({
          where: {
            id: messageId,
          },
        });
        return "message supprim??";
      }
      return new ApolloError(
        "Vous n'avez pas le droit de supprimer le message des autres"
      );
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Mutation(() => String)
  async modifyMessage(
    @Arg("messageId") messageId: number,
    @Ctx() ctx: Context,
    @Arg("newMessage") newMessage: string,
    @Arg("userId") userId: number
  ) {
    try {
      const message = await ctx.prisma.message.findUnique({
        where: {
          id: messageId,
        },
      });
      if (!message) return new ApolloError("message non existant");
      if (message.userId === userId) {
        await ctx.prisma.message.update({
          where: {
            id: messageId,
          },
          data: {
            content: newMessage,
            updatedAt: new Date(),
          },
        });
        return "message modifi??";
      }
      return new ApolloError(
        "Vous n'avez pas le droit de modifier le message des autres",
        "403"
      );
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }
}
