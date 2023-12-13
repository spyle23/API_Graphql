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
import { deleteFile, uploadFile } from "../../upload";
import GraphQLUpload from "graphql-upload/GraphQLUpload.mjs";
import { FileUpload } from "../../Types/FileUpload";
import { FileExt } from "@generated/type-graphql/models";
import { Context } from "../../context";

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
  @Authorized()
  @Mutation(() => [FileExt])
  async upload(@Arg("data", () => [GraphQLUpload]) data: FileUpload[]) {
    try {
      const fileUrls = await uploadFile(data);
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
      const response = await deleteFile(url);
      if (response) return "Le fichier a été supprimé avec succès";
    } catch (error) {
      return new ApolloError("une erreur s'est produite");
    }
  }
}
