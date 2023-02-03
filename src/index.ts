import "reflect-metadata"
import express from "express";
import * as tq from "type-graphql";
import resolvers from "./resolvers";
import cors from "cors";
import { createServer } from "http";
import { execute, subscribe } from "graphql";
import { ApolloServer } from "apollo-server-express";
import { SubscriptionServer } from "subscriptions-transport-ws";

require("dotenv").config();

const PORT = process.env.PORT || 4000;
(async () => {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  const httpServer = createServer(app);
  const schema = await tq.buildSchema({ resolvers, emitSchemaFile: true });

  const server = new ApolloServer({
    schema,
    introspection: true,
  });

  await server.start();
  server.applyMiddleware({ app, cors: false });
  SubscriptionServer.create(
    { schema, execute, subscribe },
    { server: httpServer, path: server.graphqlPath }
  );
  httpServer.listen(PORT, () => {
    console.log(
      `🚀 Query endpoint ready at http://localhost:${PORT}${server.graphqlPath}`
    );
    console.log(
      `🚀 Subscription endpoint ready at ws://localhost:${PORT}${server.graphqlPath}`
    );
  });
})();
