import { v4 as uuid } from "uuid";
import fs from "fs";

export const uploadFile = (body: string): Promise<string> => {
  const uniqueKey = uuid();
  const buffer = Buffer.from(
    body
      .replace(/^data:image\/\w+;base64,/, "")
      .replace(/^data:application\/\w+;base64,/, "")
      .replace(/^data:video\/\w+;base64,/, ""),
    "base64"
  );
  const filePath = `/uploads/images/${uniqueKey}.png`;
  const absolutePath = __dirname + filePath;
  return new Promise<string>((resolve, reject) => {
    fs.writeFile(absolutePath, buffer, "base64", (err) => {
      if (err) {
        console.log("err: ", err);
        reject(err);
      } else {
        resolve(absolutePath);
      }
    });
  });
};
