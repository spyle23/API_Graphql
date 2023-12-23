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
  CallTypeObject,
  MessageInput,
  MessageResponse,
  MessageWithRecepter,
  MessageWrittingObject,
  ResponseCallType,
} from "./type";
import { ApolloError } from "apollo-server-express";
import { DiscussionExtend } from "../discussion/type";

@Resolver(Message)
export class MessageResolver {
  @Subscription({
    topics: "SEND_MESSAGE",
    filter: async ({
      payload,
      args,
      context,
    }: ResolverFilterData<
      { message: DiscussionExtend },
      { userId: number },
      Context
    >) => {
      if (payload.message.DiscussGroup) {
        return payload.message.DiscussGroup.members.find(
          (i) => i.userId === args.userId
        )
          ? true
          : false;
      }
      return payload.message.messages[0].receiverId === args.userId;
    },
  })
  messageToUser(
    @Root("message") payload: DiscussionExtend,
    @Arg("userId") userId: number
  ): DiscussionExtend {
    return payload;
  }

  @Subscription({
    topics: "LISTEN_CALL",
    filter: ({
      args,
      payload,
    }: ResolverFilterData<
      { userToCall: CallTypeObject },
      { userId: number },
      Context
    >) => {
      return payload.userToCall.receiverId === args.userId;
    },
  })
  listenCall(
    @Root("userToCall") payload: CallTypeObject,
    @Arg("userId") userId: number
  ): CallTypeObject {
    return payload;
  }

  @Subscription({
    topics: "HANDLE_CALL",
    filter: ({
      args,
      payload,
    }: ResolverFilterData<
      { data: CallTypeObject },
      { userId: number },
      Context
    >) => {
      return payload.data.userId === args.userId;
    },
  })
  handleCall(
    @Root("data") payload: ResponseCallType,
    @Arg("userId") userId: number
  ): ResponseCallType {
    return payload;
  }

  @Subscription({
    topics: "WRITE_MESSAGE",
    filter: async ({
      payload,
      args,
      context,
    }: ResolverFilterData<
      { write: MessageWrittingObject },
      { userId: number },
      Context
    >) => {
      const discussion = await context.prisma.discussion.findFirst({
        where: { id: payload.write.discussionId },
        include: {
          DiscussGroup: {
            include: {
              members: true,
            },
          },
          User: true,
          Receiver: true,
        },
      });
      if (args.userId === payload.write.user.id) return false;
      if (discussion.DiscussGroup) {
        return discussion.DiscussGroup.members.find(
          (i) => i.userId === args.userId
        )
          ? true
          : false;
      }
      return [discussion.userId, discussion.receiverId as number].includes(
        args.userId
      )
        ? true
        : false;
    },
  })
  writeMessage(
    @Root("write") payload: MessageWrittingObject,
    @Arg("userId") userId: number
  ): MessageWrittingObject {
    console.log("mandeha ato ve")
    return {
      user: payload.user,
      isWritting: payload.isWritting,
      discussionId: payload.discussionId,
    };
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
          files: true,
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
  async callUser(
    @Arg("userId") userId: number,
    @Arg("receiverId") receiverId: number,
    @Arg("signal") signal: string,
    @PubSub() pubSub: PubSubEngine
  ) {
    try {
      await pubSub.publish("LISTEN_CALL", {
        userToCall: { userId, receiverId, signal },
      });
      return "call send success";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Mutation(() => String)
  async handleCallMutation(
    @Arg("userId") userId: number,
    @Arg("receiverId") receiverId: number,
    @Arg("signal") signal: string,
    @Arg("status") status: boolean,
    @PubSub() pubsub: PubSubEngine
  ) {
    try {
      await pubsub.publish("HANDLE_CALL", {
        data: { userId, receiverId, signal, status },
      });
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
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
  @Mutation(() => DiscussionExtend)
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
            files: {
              createMany: {
                data: messageInput.files,
              },
            },
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
            files: {
              createMany: {
                data: messageInput.files,
              },
            },
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
      await ctx.prisma.message.create({
        data: dataMessage,
      });
      const discussion = await ctx.prisma.discussion.findUnique({
        where: { id: discussionId },
        include: {
          User: true,
          Receiver: true,
          DiscussGroup: true,
          messages: {
            orderBy: { updatedAt: "desc" },
            take: 1,
            include: {
              files: true,
              User: true,
              DiscussGroup: true,
              Receiver: true,
            },
          },
        },
      });
      if (discussion) {
        await pubSub.publish("SEND_MESSAGE", {
          message: discussion,
        });
        return discussion;
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
    @Arg("discussionId") discussionId: number,
    @Arg("isWritting") isWritting: boolean,
    @Ctx() ctx: Context,
    @PubSub() pubsub: PubSubEngine
  ) {
    try {
      const user = await ctx.prisma.user.findUnique({ where: { id: userId } });
      const payload = {
        user,
        discussionId,
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
