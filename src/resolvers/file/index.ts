import { ApolloError } from "apollo-server-express";
import { IsString } from "class-validator";
import {
  Arg,
  Authorized,
  Field,
  InputType,
  Mutation,
  Resolver,
} from "type-graphql";
import { deleteFile, uploadFile } from "../../upload";

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
  @Mutation(() => String)
  async upload(@Arg("data") data: UploadInput) {
    const { name, type } = data;
    const trueType = type.split("/")[1];
    const file = await uploadFile({
      key: name,
      body: data.data,
      type: trueType,
    });
    return file;
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
