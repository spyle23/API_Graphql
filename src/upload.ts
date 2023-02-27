import { v4 as uuid } from "uuid";
import fs from "fs";

enum TypeFile {
  IMAGE = "image",
  APPLICATION = "application",
  VIDEO = "video",
}

type FileType = {
  key: string;
  body: string;
  type: string;
}

export const uploadFile = ({ key, body, type }: FileType): Promise<string> => {
  const uniqueKey = uuid();
  const keyWithName = `${uniqueKey}-${key}`
  let basePathUpload = "";
  const fileType = body.split("/")[0].split(":")[1];
  if (fileType === TypeFile.IMAGE) {
    basePathUpload = `http://localhost:${process.env.PORT}/images`;
  } else if (fileType === TypeFile.APPLICATION) {
    basePathUpload = `http://localhost:${process.env.PORT}/pdf`;
  } else {
    basePathUpload = `http://localhost:${process.env.PORT}/video`;
  }
  const buffer = Buffer.from(
    body
      .replace(/^data:image\/\w+;base64,/, "")
      .replace(/^data:application\/\w+;base64,/, "")
      .replace(/^data:video\/\w+;base64,/, ""),
    "base64"
  );
  const filePath = `./src/uploads/${fileType}/${keyWithName}.${type}`;
  return new Promise<string>((resolve, reject) => {
    fs.writeFile(filePath, buffer, "base64", (err) => {
      if (err) {
        console.log("err: ", err);
        reject(err);
      } else {
        resolve(`${basePathUpload}/${uniqueKey}.png`);
      }
    });
  });
};
