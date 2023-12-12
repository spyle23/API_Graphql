//@ts-nocheck
import { Field, InputType, ObjectType } from "type-graphql";
import { Message } from "@generated/type-graphql/models/Message";
import { IsString } from "class-validator";
import { ResponseForm } from "../../Types/ResponseForm";
import {
  DiscussGroup,
  User,
  UserOnDiscussGroup,
} from "@generated/type-graphql/models";

@InputType({ description: "message inputs" })
export class MessageInput implements Partial<Message> {
  @Field()
  @IsString()
  content: string;

  @Field(() => String, { nullable: true })
  image?: string;
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
}
@ObjectType({ description: "return type of writting subcription" })
export class MessageWrittingObject {
  @Field()
  userId: number;
  @Field()
  isWritting: boolean;
}

@ObjectType({ description: "params for fitering the writting subscription" })
export class MessageWritting extends MessageWrittingObject{
  @Field(() => Number, { nullable: true })
  receiverId?: number;
  @Field(() => DiscussGroup, { nullable: true })
  discussGroup?: DiscussGroup;
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
