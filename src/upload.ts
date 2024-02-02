import { v4 as uuid } from "uuid";
import fs from "fs";
import { FileUpload } from "./Types/FileUpload";
// import path from "path";
// import { fileURLToPath } from "url";
import { FileExt } from "@generated/type-graphql/models";
import AWS from "aws-sdk";

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

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

export class S3Management {
  bucketName: string = process.env.AWS_BUCKET_NAME;
  bucketRegion: string = process.env.AWS_BUCKET_REGION;
  accessKeyId: string = process.env.AWS_ACCESS_KEY_ID;
  secretKeyAcess: string = process.env.AWS_SECRET_KEY;
  private s3: AWS.S3;

  constructor() {
    AWS.config.update({
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretKeyAcess,
      },
      region: this.bucketRegion,
    });
    this.s3 = new AWS.S3();
  }

  async uploadFile(data: FileUpload[]): Promise<Partial<FileExt>[]> {
    console.log("config", AWS.config);
    const fileExt: Partial<FileExt>[] = [];

    for (const file of data) {
      const uniqueKey = uuid();
      const { filename, mimetype, createReadStream } = await file;
      const type = mimetype.split("/")[0];
      // const fullUploadDir = path.join(__dirname, uploadDir);
      // if (!fs.existsSync(fullUploadDir)) {
      //   fs.mkdirSync(fullUploadDir);
      // }
      const newFileName = `${filename.split(".")[0]}_${uniqueKey}.${
        filename.split(".")[1]
      }`;
      const fileStream = createReadStream();
      const uploadParams = {
        Bucket: this.bucketName,
        Key: `${type}/${newFileName}`,
        Body: fileStream,
        ContentType: mimetype,
      };
      // const filePath = path.join(fullUploadDir, newFileName);
      // const writeStream = fs.createWriteStream(filePath);
      // const promise = new Promise<string>((res, rej) => {
      //   fileStream
      //     .pipe(writeStream)
      //     .on("finish", () => res(uploadDir))
      //     .on("error", rej);
      // });
      const result = await this.s3.upload(uploadParams).promise();
      const fileToSave: Partial<FileExt> = {
        name: filename,
        url: result.Key,
        extension: mimetype,
      };

      fileExt.push(fileToSave);
    }

    return fileExt;
  }

  async deleteFile(url: string): Promise<boolean> {
    const params: AWS.S3.DeleteObjectRequest = {
      Bucket: this.bucketName,
      Key: url,
    };
    return new Promise((res, rej) => {
      this.s3.deleteObject(params, (err, data) => {
        if (data) {
          res(true);
        } else {
          rej(err);
        }
      });
    });
  }
}
