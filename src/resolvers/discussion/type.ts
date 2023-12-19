//@ts-nocheck
import { Field, InputType, ObjectType } from "type-graphql";
import { Discussion, Message, User } from "@generated/type-graphql/models";
import { GroupWithMembers, MessageWithRecepter } from "../messageResolver/type";

@ObjectType({ description: "Object that extends the discussion base models" })
export class DiscussionExtend extends Discussion {
  @Field(() => User)
  User?: User;

  @Field(() => User, { nullable: true })
  Receiver?: User;

  @Field(() => GroupWithMembers, { nullable: true })
  DiscussGroup?: GroupWithMembers;

  @Field(()=> [MessageWithRecepter])
  messages?: MessageWithRecepter[];
}

@InputType({ description: "input for changing theme discussion" })
export class DiscussionInput implements Partial<Discussion> {
    @Field()
    id?: number;

    @Field()
    theme?: string;
}