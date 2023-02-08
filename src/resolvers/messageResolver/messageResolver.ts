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

  @Mutation(() => String, { nullable: true })
  async sendMessage(
    @Arg("messageInput") messageInput: MessageInput,
    @Arg("userId") userId: number,
    @Ctx() ctx: Context,
    @PubSub() pubSub: PubSubEngine
  ) {
    try {
      const receiver = await ctx.prisma.user.findUnique({
        where: {
          id: messageInput.receiverId,
        },
      });
      if (!receiver)
        return new ApolloError("Le recepteur du message n'existe pas");
      const message = await ctx.prisma.message.create({
        data: {
          ...messageInput,
          User: {
            connect: {
              id: userId,
            },
          },
        },
      });
      if (message) {
        await pubSub.publish("SEND_MESSAGE", {
          message: message,
        });
        return "message envoyé";
      }
    } catch (error) {
      console.log(error);
      return new ApolloError("une erreure s'est produite");
    }
  }

  @Query(() => [Message])
  async messageTwoUser(
    @Arg("userId") userId: number,
    @Arg("receiverId") receiverId: number,
    @Ctx() ctx: Context
  ) {
    try {
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
    } catch (error) {
      console.log(error);
      return new ApolloError("une erreur s'est produite");
    }
  }
}
