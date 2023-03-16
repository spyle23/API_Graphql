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
};

export const uploadFile = ({ key, body, type }: FileType): Promise<string> => {
  const uniqueKey = uuid();
  let basePathUpload = "";
  const fileType = body.split("/")[0].split(":")[1];
  if (fileType === TypeFile.IMAGE) {
    basePathUpload = `${process.env.URI}/image`;
  } else if (fileType === TypeFile.APPLICATION) {
    basePathUpload = `${process.env.URI}/pdf`;
  } else {
    basePathUpload = `${process.env.URI}/video`;
  }
  const buffer = Buffer.from(
    body
      .replace(/^data:image\/\w+;base64,/, "")
      .replace(/^data:application\/\w+;base64,/, "")
      .replace(/^data:video\/\w+;base64,/, ""),
    "base64"
  );
  const filePath = `./src/uploads/${fileType}/${uniqueKey}.${type}`;
  return new Promise<string>((resolve, reject) => {
    
    fs.writeFile(filePath, buffer, "base64", (err) => {
      if (err) {
        console.log("err: ", err);
        reject(err);
      } else {
        resolve(`${basePathUpload}/${uniqueKey}.${type}`);
      }
    });
  });
};

export const deleteFile = (url: string): Promise<boolean> => {
  const arrayString = url.split("/");
  const file = arrayString[arrayString.length - 1];
  const type = arrayString[arrayString.length - 2];
  return new Promise<boolean>((resolve, reject) => {
    fs.unlink(`./src/uploads/${type}/${file}`, (err) => {
      if (err) {
        console.log("err: ", err);
        reject(false);
      } else {
        resolve(true);
      }
    });
  });
};
