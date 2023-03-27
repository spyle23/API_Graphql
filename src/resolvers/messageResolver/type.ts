import { Field, InputType, ObjectType } from "type-graphql";
import { Message } from "@generated/type-graphql/models/Message";
import { IsString } from "class-validator";
import { ResponseForm } from "../../Types/ResponseForm";
import { DiscussGroup, User } from "@generated/type-graphql/models";

@InputType({ description: "messgae inputs" })
export class MessageInput implements Partial<Message> {
  @Field()
  @IsString()
  content: string;
}

@ObjectType({ description: "message type with receiver and groupe" })
export class MessageWithRecepter extends Message {
  @Field(() => User)
  User?: User;

  @Field(() => User, { nullable: true })
  Receiver?: User;

  @Field(() => DiscussGroup, { nullable: true })
  DiscussGroup?: DiscussGroup;
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
