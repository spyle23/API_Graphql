//@ts-nocheck
import { Field, InputType, ObjectType } from "type-graphql";
import {
  DiscussGroup,
  Discussion,
  User,
  UserOnDiscussGroup,
} from "@generated/type-graphql/models";
import { IsArray, IsString } from "class-validator";
@InputType({ description: "user choose" })
export class DiscussGroupInput implements Partial<DiscussGroup> {
  @Field()
  @IsString()
  groupName: string;

  @Field({ nullable: true })
  coverPhoto?: string;
}
@ObjectType({ description: "discuss group with discussion" })
export class DiscussGroupDiscussion extends DiscussGroup {
  @Field(() => Discussion)
  Discussion?: Discussion;
}

@InputType({ description: "user id in the group discuss" })
export class UserChoose {
  @Field(() => [Number])
  @IsArray()
  membresId?: number[];
}

@ObjectType({ description: "user with his discuss group" })
export class UserWithGroup extends User {
  @Field(() => [UserOnDiscussGroup], { nullable: true })
  groupes?: UserOnDiscussGroup[];
}
