//@ts-nocheck
import { Field, ObjectType } from "type-graphql";
import {FriendRequest, User } from "@generated/type-graphql/models";

@ObjectType({ description: "friend request return type with sender" })
export class FriendRequestExtend extends FriendRequest {
    @Field(()=> User)
    User?: User;
}