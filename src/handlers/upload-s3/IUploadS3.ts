export interface IS3ParamObj {
  Key: string;
  Body: Buffer;
  ContentType: string;
}

export interface IUploadS3 {
  uploadFromURL(url: string, targetFolder: string): Promise<string>;
  uploadFromLocalFile(path: string, targetFolder: string): Promise<string>;
}
