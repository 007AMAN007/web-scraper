import json_stringify_safe from "json-stringify-safe";

function prepareToBeConsoled(str: unknown) {
  const parsedStr = convertToString(str).trim();
  const oneLineStr = `${parsedStr.split("\n").join("\\n ")}`;
  return {
    parsedStr,
    oneLineStr,
  };
}

function consoleLog(logStr: unknown): void {
  // This is required because of AWS CloudLog (see: https://forums.aws.amazon.com/thread.jspa?threadID=158643).

  const { oneLineStr } = prepareToBeConsoled(logStr);

  // eslint-disable-next-line no-console
  console.log(oneLineStr);
}

function consoleDebug(logStr: unknown): void {
  if (process.env.NODE_ENV != "production" || process.env.DEBUGGING_LEVEL) {
    consoleLog(logStr);
  }
}

function consoleKnownError(errStr: string): void {
  const { oneLineStr } = prepareToBeConsoled(errStr);
  const oneLineMessage = `KNOWN ERROR: ${oneLineStr}`;
  // eslint-disable-next-line no-console
  console.log(oneLineMessage);
  // eslint-disable-next-line no-console
  console.error(oneLineMessage);
}

function convertToString(value: unknown, shouldAddSpaceToJson = true): string {
  const isError = (obj: unknown) => {
    return Object.prototype.toString.call(obj) === "[object Error]";
    // return obj && obj.stack && obj.message && typeof obj.stack === 'string'
    //        && typeof obj.message === 'string';
  };

  try {
    switch (typeof value) {
      case "string":
      case "boolean":
      case "number":
      default:
        return "" + value;

      case "undefined":
        return "";

      case "object":
        if (value == null) {
          return "";
        } else if (isError(value)) {
          const error1: Error = value as Error;
          return error1.stack || error1.message;
        } else if (
          value.constructor.name === "ObjectID" &&
          typeof value.toString === "function"
        ) {
          return String(value);
        } else if (
          value.constructor.name === "IncomingMessage" &&
          typeof value === "object"
        ) {
          return "";
        } else {
          if (shouldAddSpaceToJson) {
            return json_stringify_safe(value, null, 2);
          } else {
            return json_stringify_safe(value);
          }
        }
    }
  } catch (e) {
    return "" + value;
  }
}

function consoleError(errStr: unknown): void {
  const { parsedStr: parsedErrorStr, oneLineStr } = prepareToBeConsoled(errStr);
  // eslint-disable-next-line no-console
  console.error(oneLineStr);

  let functionName: string;
  try {
    // eslint-disable-next-line no-console
    functionName = arguments.callee.caller.name || "Nameless func";
  } catch (e) {
    functionName = "Nameless func";
  }
}

function isDevEnvironment(): boolean {
  // return process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
  // return true;
  return false;
}

export default {
  consoleDebug,
  consoleKnownError,
  convertToString,
  consoleError,
  isDevEnvironment,
};
