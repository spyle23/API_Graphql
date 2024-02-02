import { v4 as uuid } from "uuid";
import fs from "fs";
import { FileUpload } from "./Types/FileUpload";
// import path from "path";
// import { fileURLToPath } from "url";
import { FileExt } from "@generated/type-graphql/models";

import {
  DeleteObjectCommand,
  DeleteObjectCommandInput,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

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
  private s3: S3Client;

  constructor() {
    // JS SDK v3 does not support global configuration.
    // Codemod has attempted to pass values to each service client in this file.
    // You may need to update clients outside of this file, if they use global config.
    // AWS.config.update({
    //   credentials: {
    //     accessKeyId: this.accessKeyId,
    //     secretAccessKey: this.secretKeyAcess,
    //   },
    //   region: this.bucketRegion,
    // });
    this.s3 = new S3Client({
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretKeyAcess,
      },

      region: this.bucketRegion,
    });
  }

  async uploadFile(data: FileUpload[]): Promise<Partial<FileExt>[]> {
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
      const parallelUpload = new Upload({
        client: this.s3,
        params: uploadParams,
        queueSize: 4,
        partSize: 1024 * 1024 * 5,
        leavePartsOnError: false,
      });
      parallelUpload.on("httpUploadProgress", (progress) => {
        console.log(progress);
      });
      await parallelUpload.done();
      const fileToSave: Partial<FileExt> = {
        name: filename,
        url: `${type}/${newFileName}`,
        extension: mimetype,
      };

      fileExt.push(fileToSave);
    }

    return fileExt;
  }

  async deleteFile(url: string): Promise<boolean> {
    const params: DeleteObjectCommandInput = {
      Bucket: this.bucketName,
      Key: url,
    };
    const deleteCommand = new DeleteObjectCommand(params);
    await this.s3.send(deleteCommand);
    return true;
  }
}
