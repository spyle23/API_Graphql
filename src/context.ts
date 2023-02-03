import { PrismaClient } from "@prisma/client";
import { PubSub } from "graphql-subscriptions";

const prisma = new PrismaClient();
const pubsub = new PubSub();

export interface Context {
  prisma: PrismaClient;
  token?: string;
  pubsub: PubSub;
}

export const context: Context = {
  prisma: prisma,
  pubsub: pubsub,
};
