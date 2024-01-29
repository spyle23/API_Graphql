import { Stream } from "stream";

export type FileUpload  = {
    filename: string;
    mimetype: string;
    encoding: string;
    createReadStream: ()=> Stream;
}