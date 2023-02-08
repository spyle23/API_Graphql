import { Field, InputType } from "type-graphql";
import { Message } from "@generated/type-graphql/models/Message";
import { IsString } from "class-validator";

@InputType({ description: "messgae inputs" })
export class MessageInput implements Partial<Message> {
  @Field()
  @IsString()
  content: string;
}
