import { ApolloError } from "apollo-server-express";
import { IsString } from "class-validator";
import {
  Arg,
  Authorized,
  Ctx,
  Field,
  InputType,
  Mutation,
  Resolver,
} from "type-graphql";
import { S3Management } from "../../upload";
import GraphQLUpload from "graphql-upload/GraphQLUpload.mjs";
import { FileUpload } from "../../Types/FileUpload";
import { FileExt } from "@generated/type-graphql/models";

@InputType({ description: "input for the file" })
class UploadInput {
  @Field()
  @IsString()
  name: string;
  @Field()
  data: string;
  @Field()
  @IsString()
  type: string;
}

@Resolver(String)
export class FileResolver {
  private bucketManagement: S3Management = new S3Management();
  @Authorized()
  @Mutation(() => [FileExt])
  async upload(@Arg("data", () => [GraphQLUpload]) data: FileUpload[]) {
    try {
      const fileUrls = await this.bucketManagement.uploadFile(data);
      return fileUrls;
    } catch (error) {
      console.log(error);
      return new ApolloError("une erreur s'est produite");
    }
  }

  @Authorized()
  @Mutation(() => String)
  async deleteFile(@Arg("url") url: string) {
    try {
      const response = await this.bucketManagement.deleteFile(url);
      if (response) return "Le fichier a été supprimé avec succès";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }
}
