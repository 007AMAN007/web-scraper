import { Browser } from 'puppeteer';
import PuppeteerHandler_Page from '../puppeteer-page-handler/PuppeteerHandler_Page';

export interface IPuppeteerBrowserDriverSettings {
  language: string;
  proxy: string;
}

export default interface IPuppeteerHandler_Browser {
  createNewPage(pageId: string, timeOut?: number): Promise<PuppeteerHandler_Page>;

  closePuppeteerObjects(): void;

  kill(): void;
}
