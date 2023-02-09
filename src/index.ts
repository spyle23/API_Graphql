import "reflect-metadata";
import express from "express";
import * as tq from "type-graphql";
import resolvers from "./resolvers";
import { context } from "./context";
import cors from "cors";
import { createServer } from "http";
import { execute, subscribe } from "graphql";
import { ApolloServer } from "apollo-server-express";
import { ApolloServerPluginDrainHttpServer } from "apollo-server-core";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { PrismaClient } from "@prisma/client";

require("dotenv").config();

const PORT = process.env.PORT || 4000;
(async () => {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  const httpServer = createServer(app);
  const schema = await tq.buildSchema({ resolvers, emitSchemaFile: true });
  // create web socket server
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  const serverCleanup = useServer(
    {
      schema,
      execute,
      subscribe,
      //handle event onConnect if one client is connected
      onConnect: async (_ctx) => {
        console.log("connected!!");
      },
    },
    wsServer
  );

  const server = new ApolloServer({
    schema,
    context: async ({ req }) => {
      const token = req.headers.authorization;
      return {
        ...context,
        token,
      };
    },
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
    introspection: true,
  });

  await server.start();
  server.applyMiddleware({
    app,
    bodyParserConfig: { limit: "50mb" },
    cors: false,
  });

  httpServer.listen(PORT, () => {
    console.log(
      `🚀 Query endpoint ready at http://localhost:${PORT}${server.graphqlPath}`
    );
    console.log(
      `🚀 Subscription endpoint ready at ws://localhost:${PORT}${server.graphqlPath}`
    );
  });
})();
