import utils from '../../utils/utils';
import superagent from 'superagent';
import fs from 'fs';
import { IUploadS3 } from './IUploadS3';
import path from 'path';

const file = 'UploadS3Mock';
export default class UploadS3Mock implements IUploadS3 {
  private bucketName: string = process.env.S3Bucket_bucketName || '';

  async uploadFromURL(url: string, targetFolder: string) {
    const fn = 'uploadFromURL';

    utils.consoleDebug(`${file} - ${fn} - Running`);
    utils.consoleDebug(`${file} - ${fn} - uploading url file to s3`);

    const fileName = path.basename(url);

    const bucketFolder = targetFolder ? `${targetFolder}/` : '';
    const fileKey = `${bucketFolder}${fileName}`;

    let uploadedFileUrl = '';

    await superagent
      .get(url)
      .then(async (res) => {
        utils.consoleDebug(`Uploading url file to AWS S3...`);
        uploadedFileUrl = `https://${this.bucketName}.s3.eu-west-3.amazonaws.com/${fileKey}`;
      })
      .catch((error) => {
        utils.consoleError(
          `UploadS3 - request to convert the file path url to file is failed because: ${utils.convertToString(
            error.response
          )}`
        );
      });

    return uploadedFileUrl;
  }

  async uploadFromLocalFile(filePath: string, targetFolder: string) {
    const fn = 'uploadFromLocalFile';

    utils.consoleDebug(`${file} - ${fn} - Running`);
    utils.consoleDebug(`${file} - ${fn} - reading file from folder`);

    const fileName = path.basename(filePath);

    const bucketFolder = targetFolder ? `${targetFolder}/` : '';
    const fileKey = `${bucketFolder}${fileName}`;

    return new Promise<string>((resolve, reject) => {
      fs.readFile(filePath, async (err, data) => {
        if (err) {
          utils.consoleError(`readFile - not able to read file because: ${utils.convertToString(err.stack)}`);
          return reject(err);
        } else {
          const uploadedFileUrl = `https://${this.bucketName}.s3.eu-west-3.amazonaws.com/${fileKey}`;
          return resolve(uploadedFileUrl);
        }
      });
    });
  }
}
