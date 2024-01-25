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
import { VideoCall, User } from "@generated/type-graphql/models";
import { CallStatus } from "@generated/type-graphql/enums";
import {
  CallTypeObject,
  HandleCallType,
  IDevice,
  IDeviceWithVideoCall,
  IJoin,
  ListenCallObject,
  SendSignalType,
} from "./type";
import { Context } from "../../context";
import { ApolloError } from "apollo-server-express";
import CryptoJS from "crypto-js";
import { VideoCallMembers } from "../messageResolver/type";
@Resolver(VideoCall)
export class VideoCallResolver {
  @Subscription({
    topics: "JOIN_ROOM",
    filter: ({
      args,
      payload,
    }: ResolverFilterData<{ data: IJoin }, { userId: number }, Context>) => {
      return payload.data.videoCall.members.find((a) => a.id === args.userId)
        ? true
        : false;
    },
  })
  joinRoom(@Root("data") payload: IJoin, @Arg("userId") userId: number): User {
    return payload.user;
  }
  @Subscription({
    topics: "TOOGLE_DEVICES",
    filter: ({
      args,
      payload,
    }: ResolverFilterData<
      { data: IDeviceWithVideoCall },
      { userId: number },
      Context
    >) => {
      return payload.data.videoCall.members.find((a) => a.id === args.userId)
        ? true
        : false;
    },
  })
  listenToogleDevices(
    @Root("data") payload: IDeviceWithVideoCall,
    @Arg("userId") userId: number
  ): IDevice {
    return {
      audio: payload.audio,
      userId: payload.userId,
      video: payload.video,
    };
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
      if (payload.userToCall.userId === args.userId) return false;
      if (payload.userToCall.discussion.DiscussGroup) {
        return payload.userToCall.discussion.DiscussGroup.members.find(
          (i) => i.userId === args.userId
        )
          ? true
          : false;
      }
      return [
        payload.userToCall.discussion.Receiver?.id,
        payload.userToCall.discussion.User.id,
      ].includes(args.userId)
        ? true
        : false;
    },
  })
  listenCall(
    @Root("userToCall") payload: CallTypeObject,
    @Arg("userId") userId: number
  ): ListenCallObject {
    const returnData: ListenCallObject = {
      discussion: payload.discussion,
      token: payload.token,
    };
    return returnData;
  }

  @Subscription({
    topics: "SEND_SIGNAL",
    filter: ({
      args,
      payload,
    }: ResolverFilterData<
      { data: SendSignalType },
      { userId: number },
      Context
    >) => {
      return args.userId === payload.data.receiverId;
    },
  })
  lisenSendSignal(
    @Root("data") payload: SendSignalType,
    @Arg("userId") userId: number
  ): SendSignalType {
    return payload;
  }

  @Subscription({
    topics: "LEAVE_CALL",
    filter: ({
      args,
      payload,
    }: ResolverFilterData<
      { data: HandleCallType },
      { userId: number },
      Context
    >) => {
      if (payload.data.user.id === args.userId) return false;
      return payload.data.videoCall.members.find((a) => a.id === args.userId)
        ? true
        : false;
    },
  })
  lisenLeaveCall(
    @Root("data") payload: HandleCallType,
    @Arg("userId") userId: number
  ): User {
    return payload.user;
  }

  @Subscription({
    topics: "RETURN_SIGNAL",
    filter: ({
      args,
      payload,
    }: ResolverFilterData<{ data: SendSignalType }, { userId: number }>) => {
      return payload.data.user.id === args.userId;
    },
  })
  lisenReturnSignal(
    @Root("data") payload: SendSignalType,
    @Arg("userId") userId: number
  ): SendSignalType {
    return payload;
  }

  @Subscription({
    topics: "DENIED_CALL",
    filter: ({
      args,
      payload,
    }: ResolverFilterData<{ userId: number }, { userId: number }, Context>) => {
      return args.userId === payload.userId;
    },
  })
  deniedCall(@Arg("userId") userId: number): string {
    return "Appel refusé";
  }

  @Authorized()
  @Query(() => VideoCallMembers)
  async getVideoCall(
    @Arg("userId") userId: number,
    @Arg("token") token: string,
    @PubSub() pubsub: PubSubEngine,
    @Ctx() ctx: Context
  ) {
    try {
      const key = process.env.VIDEO_SECRET || "";
      const bytes = CryptoJS.AES.decrypt(token, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
      });
      const value = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      const videoCall = await ctx.prisma.videoCall.findFirst({
        where: { id: value.videoCallId, status: CallStatus.PENDING },
        include: { members: { where: { id: { not: userId } } } },
      });
      if (!videoCall) {
        return new ApolloError("Cette appel est déjà terminé ou n'existe pas");
      }
      if (!videoCall.members.find((a) => a.id === userId)) {
        const discussion = await ctx.prisma.discussion.findUnique({
          where: { id: value.discussionId },
          include: {
            User: true,
            Receiver: true,
            DiscussGroup: { include: { members: true } },
          },
        });
        if (
          [discussion.User.id, discussion.Receiver?.id].includes(userId) ||
          discussion.DiscussGroup.members.find((a) => a.userId === userId)
        ) {
          const user = await ctx.prisma.user.findUnique({
            where: { id: userId },
          });
          const videoCallUpdated = await ctx.prisma.videoCall.update({
            where: { id: value.videoCallId },
            data: { members: { connect: { id: userId } } },
            include: { members: { where: { id: { not: userId } } } },
          });
          await pubsub.publish("JOIN_ROOM", {
            data: { user, videoCallUpdated },
          });
          return videoCallUpdated;
        }
        return new ApolloError(
          "Vous n'êtes pas authorisé à participer à ce call"
        );
      }
      return videoCall;
    } catch (error) {
      return new ApolloError("Cette appel n'existe pas");
    }
  }

  @Authorized()
  @Mutation(() => String)
  async callUser(
    @Arg("userId") userId: number,
    @Arg("discussionId") discussionId: number,
    @Ctx() ctx: Context,
    @PubSub() pubSub: PubSubEngine
  ) {
    try {
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
      const videoCall = await ctx.prisma.videoCall.create({
        data: {
          members: { connect: { id: userId } },
          discussion: { connect: { id: discussionId } },
        },
        include: { members: true },
      });
      const key = process.env.VIDEO_SECRET || "";
      const data = {
        discussionId: discussion.id,
        videoCallId: videoCall.id,
      };
      const token = CryptoJS.AES.encrypt(JSON.stringify(data), key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
      }).toString();
      await pubSub.publish("LISTEN_CALL", {
        userToCall: {
          userId,
          discussion,
          token,
        },
      });
      return token;
    } catch (error) {
      console.log(error);
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Mutation(() => String)
  async sendSignal(
    @Arg("userId") userId: number,
    @Arg("signal") signal: string,
    @Arg("receiverId") receiverId: number,
    @Ctx() ctx: Context,
    @PubSub() pubsub: PubSubEngine
  ) {
    try {
      const user = await ctx.prisma.user.findUnique({ where: { id: userId } });
      await pubsub.publish("SEND_SIGNAL", {
        data: { user, signal, receiverId },
      });
      return "joined call";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Mutation(() => String)
  async returnSignal(
    @Arg("userId") userId: number,
    @Arg("signal") signal: string,
    @Arg("receiverId") receiverId: number,
    @Ctx() ctx: Context,
    @PubSub() pubsub: PubSubEngine
  ) {
    try {
      const user = await ctx.prisma.user.findUnique({ where: { id: userId } });
      await pubsub.publish("RETURN_SIGNAL", {
        data: { user, signal, receiverId },
      });
      return "signal returned";
    } catch (error) {
      return new ApolloError("Une erreur s'est produite");
    }
  }

  @Authorized()
  @Mutation(() => String)
  async leaveCall(
    @Arg("userId") userId: number,
    @Arg("token") token: string,
    @Ctx() ctx: Context,
    @PubSub() pubsub: PubSubEngine
  ) {
    try {
      const key = process.env.VIDEO_SECRET || "";
      const bytes = CryptoJS.AES.decrypt(token, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
      });
      const value = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      const user = await ctx.prisma.user.findUnique({ where: { id: userId } });
      const videoCall = await ctx.prisma.videoCall.update({
        where: { id: value.videoCallId },
        include: { members: true },
        data: { members: { disconnect: { id: userId } } },
      }); 
      if (videoCall.members.length === 0) {
        await ctx.prisma.discussion.update({
          where: { id: value.discussionId },
          data: { VideoCall: { delete: true } },
        });
      }
      await pubsub.publish("LEAVE_CALL", {
        data: { user, videoCall, signal: "" },
      });
      return "Leave success";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Mutation(() => String)
  async handleCallMutation(
    @Arg("userId") userId: number,
    @Arg("token") token: string,
    @Arg("status") status: boolean,
    @Ctx() ctx: Context,
    @PubSub() pubsub: PubSubEngine
  ) {
    try {
      const key = process.env.VIDEO_SECRET || "";
      const bytes = CryptoJS.AES.decrypt(token, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
      });
      const value = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      if (status) {
        const user = await ctx.prisma.user.findUnique({
          where: { id: userId },
        });
        const videoCall = await ctx.prisma.videoCall.update({
          where: { id: value.videoCallId },
          data: { members: { connect: { id: userId } } },
          include: { members: { where: { id: { not: userId } } } },
        });
        await pubsub.publish("JOIN_ROOM", { data: { user, videoCall } });
      } else {
        const discussion = await ctx.prisma.discussion.findUnique({
          where: { id: value.discussionId },
          include: { Receiver: true, User: true },
        });
        if (discussion.Receiver) {
          await ctx.prisma.discussion.update({
            where: { id: value.discussionId },
            data: { VideoCall: { delete: true } },
          });
          await pubsub.publish("DENIED_CALL", {
            userId:
              userId === discussion.User.id
                ? discussion.Receiver.id
                : discussion.User.id,
          });
        }
      }
      return "handle success full";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Mutation(() => String)
  async toogleDevices(
    @Arg("userId") userId: number,
    @Arg("token") token: string,
    @Arg("audio") audio: boolean,
    @Arg("video") video: boolean,
    @Ctx() ctx: Context,
    @PubSub() pubsub: PubSubEngine
  ) {
    try {
      const key = process.env.VIDEO_SECRET || "";
      const bytes = CryptoJS.AES.decrypt(token, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
      });
      const value = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      const videoCall = await ctx.prisma.videoCall.findUnique({
        where: { id: value.videoCallId },
        include: { members: { where: { id: { not: userId } } } },
      });
      await pubsub.publish("TOOGLE_DEVICES", {
        data: { userId, video, audio, videoCall },
      });
      return "success Toogle";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }
}
