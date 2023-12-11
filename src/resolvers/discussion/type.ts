import { Field, InputType, ObjectType } from "type-graphql";
import { Discussion, User } from "@generated/type-graphql/models";
import { GroupWithMembers } from "../messageResolver/type";

@ObjectType({ description: "Object that extends the discussion base models" })
export class DiscussionExtend extends Discussion {
  @Field(() => User)
  User?: User;

  @Field(() => User, { nullable: true })
  Receiver?: User;

  @Field(() => GroupWithMembers, { nullable: true })
  DiscussGroup?: GroupWithMembers;
}

@InputType({ description: "input for changing theme discussion" })
export class DiscussionInput implements Partial<Discussion> {
    @Field()
    id?: number;

    @Field()
    theme?: string;
}