import { v4 as uuid } from "uuid";
import fs from "fs";
import { FileUpload } from "./Types/FileUpload";
import path from "path";
import { fileURLToPath } from "url";
import { FileExt } from "@generated/type-graphql/models";

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const uploadFile = async (data: FileUpload[]): Promise<Partial<FileExt>[]> => {
  const fileExt: Partial<FileExt>[] = [];

  for (const file of data) {
    const uniqueKey = uuid();
    const { filename, mimetype, createReadStream } = await file;
    const type = mimetype.split("/")[0];
    const uploadDir = `/uploads/${type}`;
    const fullUploadDir = path.join(__dirname, uploadDir);
    if (!fs.existsSync(fullUploadDir)) {
      fs.mkdirSync(fullUploadDir);
    }
    const newFileName = `${filename.split(".")[0]}_${uniqueKey}.${
      filename.split(".")[1]
    }`;
    const filePath = path.join(fullUploadDir, newFileName);
    const fileStream = createReadStream();
    const writeStream = fs.createWriteStream(filePath);
    const promise = new Promise<string>((res, rej) => {
      fileStream
        .pipe(writeStream)
        .on("finish", () => res(uploadDir))
        .on("error", rej);
    });

    const fileToSave: Partial<FileExt> = {
      name: filename,
      url: await promise,
      extension: type
    }

    fileExt.push(fileToSave);
  }

  return fileExt;
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
