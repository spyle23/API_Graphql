
export type FileUpload  = {
    filename: string;
    mimetype: string;
    encoding: string;
    createReadStream: ()=> any;
}