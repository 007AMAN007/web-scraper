// cSpell:ignore webscraper
import nock, { DataMatcherArray, DataMatcherMap } from 'nock';
import { ParsedUrlQuery } from 'querystring';
import { Url } from 'url';
import zlib from 'zlib';
import fs from 'fs';

import utils from '../utils/utils';

import { IHeaders, IQueryParams } from '../types/NetworkRelated';

const FILE_NAME = `record-${new Date().toISOString()}.txt`;

function gzipEncode(input: unknown) {
  const inputAsString = JSON.stringify(input);
  const tempBuffer = Buffer.from(inputAsString);
  const zippedBuffer = zlib.gzipSync(tempBuffer);

  return zippedBuffer.toString('hex');
}

const requestEventHandler = (req: unknown, interceptor: { uri: unknown }) => {
  utils.consoleLog('Nock - interceptor matched request' + interceptor.uri); // tslint:disable-line // eslint-disable-line no-console
};

const repliedEventHandler = (req: unknown, interceptor: { uri: unknown }) => {
  utils.consoleLog('Nock - response replied with nocked payload' + interceptor.uri); // tslint:disable-line // eslint-disable-line no-console
};

// Startup settings
nock.emitter.on('no match', (req) => {
  const isLocalHost =
    req.hostname && (req.hostname.includes('127.0.0.1') || req.hostname.toLowerCase().includes('localhost'));
  if (!isLocalHost) {
    utils.consoleLog(`Nock - 'no match' event was triggered!\nRequest: ${utils.convertToString(req)}`);
  }
});

function denyRealInternetConnection() {
  nock.disableNetConnect(); // Throws an exception if a request is actually sent to the internet instead of the mockup. To overcome such exception - just add a mockup to handle that request as well
  allowRealInternetConnection_toLocalhost();
}

export function allowRealInternetConnection_toLocalhost() {
  // cSpell:ignore ipstack ipgeolocation
  nock.enableNetConnect(/(localhost|127\.0\.0\.1)/); // Prevent from throwing an exception to the localhost
}

const appendLogToFile = (content: string) => {
  fs.appendFileSync(FILE_NAME, content);
};

export enum METHODS {
  GET = 'GET',
  POST = 'POST',
}

export default class NockHandler {
  static setMockup(
    protocolAndDomain: string | RegExp | Url,
    path: string | RegExp | ((uri: string) => boolean),
    method: METHODS,
    requestQueryParams:
      | string
      | boolean
      | nock.DataMatcherMap
      | URLSearchParams
      | ((parsedObj: ParsedUrlQuery) => boolean),
    requestBody: string | RegExp | DataMatcherMap | DataMatcherArray | Buffer | ((body: unknown) => boolean),
    requestHeaders: IHeaders,
    responseStatusCode: nock.StatusCode,
    responseBody: nock.Body,
    responseHeaders: nock.ReplyHeaders
  ): nock.Scope {
    const nockScope: nock.Scope = nock(protocolAndDomain);
    const nockInterceptor: nock.Interceptor =
      method === METHODS.GET ? nockScope.get(path || '/') : nockScope.post(path || '/', requestBody || undefined);

    nockInterceptor.query(requestQueryParams);

    if (requestHeaders) {
      Object.keys(requestHeaders).forEach((key) => {
        nockInterceptor.matchHeader(key, requestHeaders[key]);
      });
    }

    let shouldGZipResponseBody = false;
    (Object.keys(responseHeaders) as (keyof typeof responseHeaders)[]).forEach((key) => {
      if (key.toLowerCase() == 'content-encoding') {
        const headerValue = responseHeaders[key];
        if (typeof headerValue == 'string' && headerValue.toLowerCase().includes('gzip')) {
          shouldGZipResponseBody = true;
        } else if (Array.isArray(headerValue)) {
          headerValue.forEach((str1) => {
            if (str1.toLowerCase().includes('gzip')) {
              shouldGZipResponseBody = true;
            }
          });
        }
      }
    });
    const parsedResponseBody = shouldGZipResponseBody ? gzipEncode(responseBody) : responseBody;
    const scope = nockInterceptor.reply(responseStatusCode, parsedResponseBody, responseHeaders);

    scope.on('request', requestEventHandler);
    scope.on('replied', repliedEventHandler);

    return scope;
  }

  static runBeforeEachTest(printRecorderOutput = false): void {
    if (!nock.isActive()) nock.activate();
    // // cSpell:disable
    // nock.recorder.rec({
    //   dont_print: !printRecorderOutput,
    //   output_objects: true,
    //   enable_reqheaders_recording: true,
    //   logging: appendLogToFile,
    // });
    // // cSpell:enable
    denyRealInternetConnection();
  }

  static runWhenEachTestIsOver(): void {
    // nock.abortPendingRequests();
    const nockCallObjects = nock.recorder.play();
    utils.consoleLog(`Nock.runWhenEachTestIsOver - Recorder data: ${utils.convertToString(nockCallObjects)}`);
    nock.cleanAll(); // Clean all mocks
    nock.enableNetConnect(); // Allowing to access the REAL internet
    nock.recorder.clear();
    nock.restore();
  }
}
