import { Reaction } from "@generated/type-graphql/models/Reaction";
import { ReactionType } from "@generated/type-graphql/enums/ReactionType";
import { Field, InputType } from "type-graphql";
import { IsString } from "class-validator";

@InputType({ description: "input of the reaction" })
export class ReactionInput implements Partial<Reaction> {
  @Field(() => ReactionType)
  @IsString()
  reactionType: ReactionType;
}
