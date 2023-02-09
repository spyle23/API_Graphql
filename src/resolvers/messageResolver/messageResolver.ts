import {
  Arg,
  Ctx,
  Mutation,
  PubSub,
  PubSubEngine,
  Query,
  Resolver,
  Root,
  Subscription,
} from "type-graphql";
import { Message } from "@generated/type-graphql/models/Message";
import { User } from "@generated/type-graphql/models/User";
import { Context } from "../../context";
import { MessageInput, MessageResponse } from "./type";
import { ApolloError } from "apollo-server-express";

@Resolver(Message)
export class MessageResolver {
  @Subscription({
    topics: "SEND_MESSAGE",
    filter: async ({ payload, args }) => {
      return payload.message.receiverId === args.userId;
    },
  })
  messageToUser(
    @Root("message") payload: Message,
    @Arg("userId") userId: number
  ): Message {
    return payload;
  }

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
          message: "message envoyé",
          success: true,
        } as MessageResponse;
      }
    } catch (error) {
      return new ApolloError("Une erreur s'est produite");
    }
  }

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
}
