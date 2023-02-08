import { Field, InputType } from "type-graphql";
import { DiscussGroup } from "@generated/type-graphql/models/DiscussGroup";
import { IsArray, IsString } from "class-validator";
@InputType({ description: "user choose" })
export class DiscussGroupInput implements Partial<DiscussGroup> {
  @Field()
  @IsString()
  groupName: string;

  @Field({ nullable: true })
  coverPhoto?: string;
}

@InputType({ description: "user id in the group discuss" })
export class UserChoose {
  @Field(() => [Number])
  @IsArray()
  membresId?: number[];
}
