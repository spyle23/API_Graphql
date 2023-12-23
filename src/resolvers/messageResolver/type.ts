//@ts-nocheck
import { Field, InputType, ObjectType, ObjectType } from "type-graphql";
import { Message } from "@generated/type-graphql/models/Message";
import { IsString } from "class-validator";
import { ResponseForm } from "../../Types/ResponseForm";
import {
  DiscussGroup,
  FileExt,
  User,
  UserOnDiscussGroup,
} from "@generated/type-graphql/models";
import { FileInput } from "../postResolver/type";

@InputType({ description: "message inputs" })
export class MessageInput implements Partial<Message> {
  @Field()
  @IsString()
  content: string;

  @Field(()=>[FileInput])
  files?: FileInput[];
}
@ObjectType({ description: "group with members" })
export class GroupWithMembers extends DiscussGroup {
  @Field(() => [UserOnDiscussGroup])
  members?: UserOnDiscussGroup[];
}

@ObjectType({ description: "message type with receiver and groupe" })
export class MessageWithRecepter extends Message {
  @Field(() => User)
  User?: User;

  @Field(() => User, { nullable: true })
  Receiver?: User;

  @Field(() => GroupWithMembers, { nullable: true })
  DiscussGroup?: GroupWithMembers;

  @Field(()=> [FileExt])
  files?: FileExt[];
}
@ObjectType({ description: "return type of writting subcription" })
export class MessageWrittingObject {
  @Field(()=> User)
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

@ObjectType({ description: "payload for call video stream" })
export class CallTypeObject {
  @Field()
  userId: number;

  @Field()
  receiverId: number;

  @Field()
  signal: string;
}

@ObjectType({ description: "payload for handle video call " })
export class ResponseCallType extends CallTypeObject {
  @Field()
  status: boolean;
}
