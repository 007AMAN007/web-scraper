import { LoadEvent } from 'puppeteer';

export interface IPageViewPort {
  width: number;
  height: number;
  deviceScaleFactor: number;
}

export interface resultOfferPage {
  elements: NodeListOf<HTMLElement>;
}

export interface IPuppeteerHandler_Page {
  navigateTo(url: string, waitUntil?: LoadEvent): Promise<void>;

  pageReload(waitUntil: LoadEvent): Promise<void>;

  clearCookiesAndStorage(): void;

  bringToFront(): Promise<void>;

  takeScreenshotAndSaveInLocal(path: string, isFullPage: boolean): Promise<string>;

  buttonClick(btnSelector: string, btnMessage: string): Promise<void>;

  waitForTime(time: number): Promise<void>;

  waitForElement(element: string): void;

  checkIfElementExist(elementToVerify: string): Promise<boolean>;

  innerWidth(): Promise<number>;

  innerHeight(): Promise<number>;

  getViewPort(): Promise<IPageViewPort>;

  getUserAgent(): Promise<string>;

  scroll(XYCoordinate: number): void;

  // close(): void;

  getPageEvaluateResult<T>(pageResult: (...args: string[]) => Promise<T>, ...args: string[]): Promise<T>;

  waitTillHTMLRendered(timeout?: number): Promise<void>;

  getURL(): string;

  getArrayOfRedirectURLs(): string[];

  kill(): Promise<void>;

  takeElementScreenshotAndSaveInLocal(elementSelector: string, directoryPath: string): Promise<string>;

  offerPageResult(): Promise<void>;

  fillInput(elementSelector: string, textToInput: string): Promise<void>;
}
