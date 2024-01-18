//@ts-nocheck
import { Field, InputType, ObjectType } from "type-graphql";
import { Message } from "@generated/type-graphql/models/Message";
import { IsString } from "class-validator";
import { ResponseForm } from "../../Types/ResponseForm";
import { FileExt, User, VideoCall } from "@generated/type-graphql/models";
import { FileInput } from "../postResolver/type";
import { DiscussionExtend, GroupWithMembers } from "../discussion/type";

@InputType({ description: "message inputs" })
export class MessageInput implements Partial<Message> {
  @Field()
  @IsString()
  content: string;

  @Field(() => [FileInput])
  files?: FileInput[];
}

@ObjectType({ description: "message type with receiver and groupe" })
export class MessageWithRecepter extends Message {
  @Field(() => User)
  User?: User;

  @Field(() => User, { nullable: true })
  Receiver?: User;

  @Field(() => GroupWithMembers, { nullable: true })
  DiscussGroup?: GroupWithMembers;

  @Field(() => [FileExt])
  files?: FileExt[];
}
@ObjectType({ description: "return type of writting subcription" })
export class MessageWrittingObject {
  @Field(() => User)
  user: User;
  @Field()
  discussionId: number;
  @Field()
  isWritting: boolean;
}
@ObjectType({ description: "message response type" })
export class MessageResponse extends ResponseForm<Message[]> {
  @Field()
  message: string;

  @Field(() => [Message], { nullable: true })
  data?: Message[];

  @Field()
  success: boolean;
}

@ObjectType({ description: "videoCall with members" })
export class VideoCallMembers extends VideoCall {
  @Field(() => [User])
  members?: User[];
}
