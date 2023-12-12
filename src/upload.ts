import { v4 as uuid } from "uuid";
import fs from "fs";
import { FileUpload } from "./Types/FileUpload";
import path from "path";
import { fileURLToPath } from "url";

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

export const uploadFile = async(data: FileUpload[]): Promise<string[]> => {
  const filePromises: string[] = [];

  for(const file of data) {
    const uniqueKey = uuid();
    const { filename, mimetype, createReadStream } = await file;
    const type = mimetype.split("/")[0];
    const uploadDir = `/uploads/${type}`;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    const newFileName = `${filename.split(".")[0]}_${uniqueKey}.${
      filename.split(".")[1]
    }`;
    const filePath = path.join(uploadDir, newFileName);
    const fileStream = createReadStream();
    const writeStream = fs.createWriteStream(filePath);

    const promise = new Promise<string>((res, rej) => {
      fileStream
        .pipe(writeStream)
        .on("finish", () => res(filePath))
        .on("error", rej);
    });

    filePromises.push(await promise);
  };

  return filePromises;
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
