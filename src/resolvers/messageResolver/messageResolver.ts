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
import {
  MessageInput,
  MessageResponse,
  MessageWithRecepter,
  MessageWritting,
  MessageWrittingObject,
} from "./type";
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
            discussGroupId === payload.message.discussGroupId &&
            payload.message.userId !== args.userId
        )
          ? true
          : false;
      }
      return payload.message.receiverId === args.userId;
    },
  })
  messageToUser(
    @Root("message") payload: MessageWithRecepter,
    @Arg("userId") userId: number
  ): MessageWithRecepter {
    return payload;
  }

  @Subscription({
    topics: "WRITE_MESSAGE",
    filter: ({
      payload,
      args,
    }: ResolverFilterData<
      { write: MessageWritting },
      { userId: number },
      Context
    >) => {
      if (payload.write.discussGroup) {
        return payload.write.discussGroup.members.find(
          (i) => i.userId === args.userId
        )
          ? true
          : false;
      }
      return payload.write.receiverId === args.userId;
    },
  })
  writeMessage(
    @Root("write") payload: MessageWritting,
    @Arg("userId") userId: number
  ): MessageWrittingObject {
    return {
      userId: payload.userId,
      isWritting: payload.isWritting,
    };
  }

  // @Authorized()
  // @Query(() => [MessageWithRecepter])
  // async messagesOfCurrentUser(
  //   @Arg("userId") userId: number,
  //   @Ctx() ctx: Context
  // ) {
  //   try {
  //     const messages = await ctx.prisma.message.findMany({
  //       include: {
  //         User: true,
  //         Receiver: true,
  //         DiscussGroup: {
  //           include: {
  //             members: true,
  //           },
  //         },
  //       },
  //       orderBy: {
  //         createdAt: "desc",
  //       },
  //     });
  //     const filteredMessages = messages.filter(
  //       (message) =>
  //         (message.userId === userId && message.receiverId !== userId) ||
  //         (message.receiverId === userId && message.userId !== userId) ||
  //         (message.DiscussGroup?.members.find(
  //           (value) => value.userId === userId
  //         )
  //           ? true
  //           : false)
  //     );

  //     // console.log("filteredMessages", filteredMessages);

  //     const uniqueMessages: (Message & {
  //       User: User;
  //       Receiver: User;
  //       DiscussGroup: DiscussGroup;
  //     })[] = [];

  //     const uniqueCombinaison: { [key: string]: boolean } = {};

  //     filteredMessages.forEach((message) => {
  //       const shortedKey = message.receiverId
  //         ? [message.userId, message.receiverId].sort((a, b) => a - b)
  //         : [message.discussGroupId];
  //       const key =
  //         shortedKey.length > 1
  //           ? `${shortedKey[0]}-${shortedKey[1]}`
  //           : `${shortedKey[0]}`;

  //       if (!uniqueCombinaison[key]) {
  //         uniqueCombinaison[key] = true;
  //         uniqueMessages.push(message);
  //       }
  //       // const existingMessage = uniqueMessages.some(
  //       //   (m) =>
  //       //     (m.userId === message.userId &&
  //       //       m.receiverId === message.receiverId) ||
  //       //     (m.userId === message.receiverId &&
  //       //       m.receiverId === message.userId) ||
  //       //     m.discussGroupId === message.discussGroupId
  //       // );
  //     });

  //     return uniqueMessages;
  //   } catch (error) {
  //     return new ApolloError("une erreur s'est produite");
  //   }
  // }

  @Authorized()
  @Mutation(() => MessageResponse)
  async sendMessageDiscoussGroup(
    @Arg("messageInput") messageInput: MessageInput,
    @Arg("userId") userId: number,
    @Arg("discussionId") discussionId: number,
    @Arg("receiverId", { nullable: true }) receiverId: number,
    @Arg("discussGroupId", { nullable: true }) discussGroupId: number,
    @PubSub() pubSub: PubSubEngine,
    @Ctx() ctx: Context
  ) {
    try {
      const dataMessage = receiverId
        ? {
            ...messageInput,
            Discussion: {
              connect: {
                id: discussionId,
              },
            },
            Receiver: {
              connect: {
                id: receiverId,
              },
            },
            User: {
              connect: {
                id: userId,
              },
            },
          }
        : {
            ...messageInput,
            Discussion: {
              connect: {
                id: discussionId,
              },
            },
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
      const message = await ctx.prisma.message.create({
        data: dataMessage,
        include: {
          User: true,
          Receiver: true,
          DiscussGroup: true,
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
      console.log(error);
      return new ApolloError("Une erreur s'est produite");
    }
  }

  @Authorized()
  @Mutation(() => MessageResponse)
  async writtingCheck(
    @Arg("userId") userId: number,
    @Arg("receiverId", { nullable: true }) receiverId: number,
    @Arg("discussGroupId", { nullable: true }) discussGroupId: number,
    @Arg("isWritting") isWritting: boolean,
    @Ctx() ctx: Context,
    @PubSub() pubsub: PubSubEngine
  ) {
    try {
      const discussGroup = discussGroupId
        ? await ctx.prisma.discussGroup.findUnique({
            where: { id: discussGroupId },
          })
        : null;
      const payload = {
        userId,
        receiverId,
        discussGroup,
        isWritting,
      };
      await pubsub.publish("WRITE_MESSAGE", { write: payload });
      return {
        message: "check status writting",
        success: true,
      } as MessageResponse;
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Query(() => [MessageWithRecepter])
  async messageTwoUser(
    @Arg("discussionId") discussionId: number,
    @Ctx() ctx: Context
  ) {
    try {
      const messages = await ctx.prisma.message.findMany({
        where: { discussionId },
        include: {
          User: true,
          Receiver: true,
          DiscussGroup: {
            include: {
              members: true,
            },
          },
        },
      });
      return messages;
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
        return "message supprimé";
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
        return "message modifié";
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
