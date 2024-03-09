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
import {
  Message,
  FileExt,
  User,
  DiscussGroup,
} from "@generated/type-graphql/models";
import { Context } from "../../context";
import {
  MessageInput,
  MessageResponse,
  MessageWithRecepter,
  MessageWrittingObject,
} from "./type";
import { ApolloError } from "apollo-server-express";
import { DiscussionExtend } from "../discussion/type";
import GraphQLUpload from "graphql-upload/GraphQLUpload.mjs";
import { FileUpload } from "../../Types/FileUpload";
import { S3Management } from "../../upload";

@Resolver(Message)
export class MessageResolver {
  private bucketManagement: S3Management = new S3Management();
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
      if (payload.message.messages[0].userId === args.userId) return false;
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
    @Arg("cursor", { nullable: true }) cursor: number,
    @Arg("limit", { defaultValue: 10 }) limit: number,
    @Ctx() ctx: Context
  ) {
    try {
      const filters: any = {
        where: { discussionId },
        include: {
          User: true,
          Receiver: true,
          files: true,
          DiscussGroup: true,
        },
        orderBy: { id: "desc" },
        take: limit,
      };
      const messages = (await ctx.prisma.message.findMany(
        cursor ? { ...filters, cursor: { id: cursor }, skip: 1 } : filters
      )) as (Message & {
        User: User;
        Receiver?: User;
        files: FileExt[];
        DiscussGroup: DiscussGroup;
      })[];
      const sortedMessages = messages.sort((a, b) => a.id - b.id);
      return sortedMessages;
    } catch (error) {
      console.log(error);
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
          DiscussGroup: {
            include: {
              members: true,
            },
          },
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
          message: {
            ...discussion,
            User: discussion.User,
            Receiver: discussion.Receiver ?? null,
          },
        });
        return discussion;
      }
    } catch (error) {
      console.log(error);
      return new ApolloError("Une erreur s'est produite");
    }
  }

  @Authorized()
  @Mutation(() => DiscussionExtend)
  async sendMessageDiscussGroupMobile(
    @Arg("data", () => [GraphQLUpload], { nullable: true }) data: FileUpload[],
    @Arg("messageInput") messageInput: MessageInput,
    @Arg("userId") userId: number,
    @Arg("discussionId") discussionId: number,
    @Arg("receiverId", { nullable: true }) receiverId: number,
    @Arg("discussGroupId", { nullable: true }) discussGroupId: number,
    @PubSub() pubSub: PubSubEngine,
    @Ctx() ctx: Context
  ) {
    try {
      const fileUrls = data ? await this.bucketManagement.uploadFile(data) : [];
      const redefinedMessageInput: MessageInput = {
        ...messageInput,
        files: fileUrls as any[],
      };
      return await this.sendMessageDiscoussGroup(
        redefinedMessageInput,
        userId,
        discussionId,
        receiverId,
        discussGroupId,
        pubSub,
        ctx
      );
    } catch (error) {
      console.log(error);
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
        user: { ...user, status: true },
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
