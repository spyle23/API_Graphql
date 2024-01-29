import { Field, ObjectType } from "type-graphql";
import { User } from "@generated/type-graphql/models";
import { DiscussionExtend } from "../discussion/type";
import { VideoCallMembers } from "../messageResolver/type";

@ObjectType({ description: "return type for listen call" })
export class ListenCallObject {
  @Field(() => DiscussionExtend)
  discussion: DiscussionExtend;

  @Field()
  token: string;
}

@ObjectType({ description: "payload for call video stream" })
export class CallTypeObject extends ListenCallObject {
  @Field()
  userId: number;
}

@ObjectType({ description: "response for handle video call " })
export class ResponseCallType {
  @Field()
  signal: string;

  @Field(() => User)
  user: User;
}

@ObjectType({ description: "send signal type" })
export class SendSignalType {
  @Field()
  signal: string;
  @Field(() => User)
  user: User;
  @Field()
  audio: boolean;
  @Field()
  video: boolean;
  @Field()
  receiverId: number;
}

@ObjectType({ description: "payload for handle video call" })
export class HandleCallType extends ResponseCallType {
  @Field(() => VideoCallMembers)
  videoCall: VideoCallMembers;
}

@ObjectType({ description: "Data type for query video call" })
export class GetVideoCall {
  @Field(() => VideoCallMembers)
  videoCall: VideoCallMembers;
  @Field()
  signal: string;
}

@ObjectType({ description: "for join room" })
export class IJoin {
  @Field(() => VideoCallMembers)
  videoCall: VideoCallMembers;
  @Field(() => User)
  user: User;
}
