import utils from '../utils/utils';
import AWS from 'aws-sdk';
import request from 'request-promise';

export async function uploadS3(srcUrl: string) {
  utils.consoleLog('Start uploading to AWS S3');
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
  });
  const options = {
    uri: srcUrl,
    encoding: null,
  };

  let keyVal = '';
  const parts = srcUrl.split('/');
  keyVal = parts.pop() || '';

  let keyContentType = '';
  if (keyVal.split('.')[1] === 'jpg' || keyVal.split('.')[1] === 'gif' || keyVal.split('.')[1] === 'png') {
    keyContentType = 'image/' + keyVal.split('.')[1];
  } else if (keyVal.split('.')[1] === 'mp4') {
    keyContentType = 'video/' + keyVal.split('.')[1];
  } else {
    const errStr = `awsS3Handler - the file type is unknown: ${srcUrl}`;
    utils.consoleError(errStr);
    throw new Error(errStr);
  }

  utils.consoleDebug('ContentType = ' + keyContentType);

  return request(options, async (error, response, body) => {
    if (error || response.statusCode !== 200) {
      utils.consoleError(`UploadS3 - request to convert the file path url to file is failed because: ${error}`);
    } else {
      utils.consoleDebug(`Uploading file to AWS S3...`);
      s3.putObject(
        {
          Body: body,
          Key: keyVal,
          Bucket: process.env.AWS_S3_BUCKET_NAME || '',
          ContentType: keyContentType,
        },
        (err: AWS.AWSError) => {
          if (err) {
            utils.consoleError(
              `UploadS3 - request to upload the file to S3 bucket is failed because: ${utils.convertToString(err)}`
            );
            return '';
          } else {
            return process.env.AWS_S3_BUCKET_URL_PREFIX + keyVal;
          }
        }
      );
    }
  });
}
/*
import utils from '../../utils';
import AWS, { S3 } from 'aws-sdk';
import superagent from 'superagent';
import fs from 'fs';
import { IUploadS3 } from './IUploadS3';
import FileType from 'file-type';
import path from 'path';

const file = 'UploadS3';

export default class UploadS3 implements IUploadS3 {
  private s3 = new AWS.S3({
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
  });

  private bucketName: string = process.env.AWS_S3_BUCKET_NAME || '';

  async uploadFromURL(url: string, targetFolder: string) {
    const fn = 'uploadFromURL';

    utils.consoleDebug(`${file} - ${fn} - uploading url file to s3`);

    const fileName = path.basename(url);

    const bucketFolder = targetFolder ? `${targetFolder}/` : '';
    const fileKey = `${bucketFolder}${fileName}`;

    let uploadedFileUrl = '';

    await superagent
      .get(url)
      .then(async res => {
        utils.consoleDebug(`Uploading url file to AWS S3...`);
        uploadedFileUrl = await this.calcContentTypeAndActuallyUploadToS3(res.body, fileKey);
      })
      .catch(error => {
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
          const uploadedFileUrl = await this.calcContentTypeAndActuallyUploadToS3(data, fileKey);
          return resolve(uploadedFileUrl);
        }
      });
    });
  }

  private async calcContentTypeAndActuallyUploadToS3(content: Buffer, fileKey: string) {
    const fn = 'calcContentTypeAndActuallyUploadToS3';

    utils.consoleDebug(`${file} - ${fn} - actually uploading file to S3 bucket`);

    const fileTypeResult = await FileType.fromBuffer(content);
    const fileMimeType = fileTypeResult?.mime;

    const params: S3.Types.PutObjectRequest = {
      Bucket: this.bucketName,
      Key: fileKey,
      Body: content,
      ContentType: fileMimeType,
    };

    return this.s3
      .upload(params)
      .promise()
      .then(data => {
        // TODO: Need to check why data.Location return dynamic URL. So for now return hardcoded URL.
        // return data.Location;
        return `https://${this.bucketName}.s3.eu-west-3.amazonaws.com/${fileKey}`;
      })
      .catch(uploadErr => {
        utils.consoleError(
          `UploadS3 - request to upload the file to S3 bucket is failed because: ${utils.convertToString(
            uploadErr.stack + '\n' + 'Bucket = ' + this.bucketName
          )}`
        );
        return '';
      });
  }
}

//*/
