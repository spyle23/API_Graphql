import express from "express";
import cors from "cors";
import { createServer } from "http";

require("dotenv").config();

const PORT = process.env.PORT || 4000;
(async () => {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  const httpServer = createServer(app);


  httpServer.listen(PORT, ()=>{
    console.log("mandeha le server")
  })

})();
