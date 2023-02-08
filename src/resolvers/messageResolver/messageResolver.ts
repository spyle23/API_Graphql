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
import { Context } from "../../context";
import { MessageInput } from "./type";
import { ApolloError } from "apollo-server-express";

@Resolver(Message)
export class MessageResolver {
  @Subscription({ topics: "SEND_MESSAGE" })
  messageToUser(@Root("message") payload: Message): Message {
    return payload;
  }

  @Mutation(() => String)
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
        return "message envoyé";
      }
    } catch (error) {
      return new ApolloError("Une erreur s'est produite");
    }
  }

  @Query(() => [Message])
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
        return [...messageByReceiverId, ...messagesByUserId];
      }
      const messagesGroup = await ctx.prisma.message.findMany({
        where: {
          discussGroupId: discussGroupId,
        },
      });
      return messagesGroup;
    } catch (error) {
      console.log(error);
      return new ApolloError("une erreur s'est produite");
    }
  }
}