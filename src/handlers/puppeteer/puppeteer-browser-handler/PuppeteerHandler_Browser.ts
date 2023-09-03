import Puppeteer from 'puppeteer-extra';
import { Browser, Page } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import utils from '../../../utils/utils';
import PuppeteerHandler_Page from '../puppeteer-page-handler/PuppeteerHandler_Page';
import IPuppeteerHandler_Browser from './IPuppeteerHandler_Browser';
import { IProxy } from './vpn-handler/IProxy';
// import { Robot_Device_List } from '../../../db/entity/Robot_Device_List';

// Puppeteer.use(StealthPlugin());
const DEFAULT_NAVIGATION_TIMEOUT = 600000;
const file = 'PuppeteerHandler_Browser';
export default class PuppeteerHandler_Browser implements IPuppeteerHandler_Browser {
  private _driver: Browser;
  private _pageList: { [pageId: string]: PuppeteerHandler_Page } = {};
  private _vpnHandler?: IProxy;
  // private _deviceSavedList: Robot_Device_List;
  private _languageSavedValue: string;
  private _countryTimeZone: string;
  private _downloadFolderPath?: string;

  private constructor(
    driver: Browser,
    // deviceSavedList: Robot_Device_List,
    languageSavedValue: string,
    countryTimezone: string,
    downloadFolderPath?: string,
    vpnHandler?: IProxy
  ) {
    this._driver = driver;
    this._vpnHandler = vpnHandler;
    // this._deviceSavedList = deviceSavedList;
    this._languageSavedValue = languageSavedValue;
    this._countryTimeZone = countryTimezone;
    this._downloadFolderPath = downloadFolderPath;
  }

  static async createNewBrowser(
    // deviceSavedList: Robot_Device_List,
    languageSavedValue: string,
    countryTimezone: string,
    downloadFolderPath?: string,
    vpnHandler?: IProxy
  ) {
    const fn = 'createNewBrowser';

    utils.consoleDebug(`${file} - ${fn} - Running`);
    utils.consoleDebug(`${file} - Creating new browser`);

    // const browser = await PuppeteerHandler_Browser.createPuppeteerObject_Browser(languageSavedValue, vpnHandler);
    // return new this(browser, deviceSavedList, languageSavedValue, countryTimezone, vpnHandler);
    const browser = await PuppeteerHandler_Browser.createPuppeteerObject_Browser(languageSavedValue, vpnHandler);
    return new this(browser, languageSavedValue, countryTimezone, downloadFolderPath, vpnHandler);
  }

  private static async createPuppeteerObject_Browser(languageSavedValue: string, vpnHandler?: IProxy) {
    const browserArgs = [`--lang=${languageSavedValue}`];
    if (vpnHandler) {
      browserArgs.push('--proxy-server=' + vpnHandler.getHostname());
    }
    Puppeteer.use(StealthPlugin());
    const browser = await Puppeteer.launch({
      headless: !utils.isDevEnvironment(),
      args: browserArgs,
    });
    return browser;
  }

  private async createPuppeteerObject_Page(timeOut: number): Promise<Page> {
    const page = await this._driver.newPage();
    const client = await page.target().createCDPSession();
    if (this._downloadFolderPath) {
      await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: `./${this._downloadFolderPath}`,
      });
    }
    // await page.setUserAgent(this._deviceSavedList.User_Agent);
    await page.setExtraHTTPHeaders({
      'Accept-Language': this._languageSavedValue,
    });
    // await page.setViewport({
    //   width: this._deviceSavedList.width,
    //   height: this._deviceSavedList.height,
    //   deviceScaleFactor: this._deviceSavedList.deviceScaleFactor,
    // });
    await page.emulateTimezone(this._countryTimeZone);
    page.setDefaultNavigationTimeout(timeOut);

    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'beforeunload') {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
    if (this._vpnHandler) {
      await page.authenticate({
        username: this._vpnHandler.getUsername(),
        password: this._vpnHandler.getPassword(),
      });
    }
    return page;
  }

  async closePuppeteerObjects() {
    const fn = 'closePuppeteerObjects';

    utils.consoleDebug(`${file} - ${fn} - Running`);
    utils.consoleDebug(`${file} - Closing the browser`);

    for (const pageId of Object.keys(this._pageList)) {
      if (this._pageList[pageId]) {
        await this._pageList[pageId].closePuppeteerObject();
      }
    }
    try {
      if (this._driver) {
        await this._driver.close();
      }
    } catch (err) {
      // Do nothing.
    }
  }

  async createNewPage(pageId: string, timeOut: number = DEFAULT_NAVIGATION_TIMEOUT): Promise<PuppeteerHandler_Page> {
    const fn = 'createNewPage';

    utils.consoleDebug(`${file} - ${fn} - Running`);
    utils.consoleDebug(`${file} - Creating new page with pageId = ${pageId}`);

    const pageExistWithId = this.getPageById(pageId);

    if (pageExistWithId) {
      throw new Error(`${file} - ${fn} - page already exist with same id = ${pageId}`);
    }

    const removePageFromParentList = (() => {
      delete this._pageList[pageId];
    }).bind(this);
    const page = await this.createPuppeteerObject_Page(timeOut);
    this._pageList[pageId] = new PuppeteerHandler_Page(page, removePageFromParentList, this.restartBrowser, timeOut);
    return this._pageList[pageId];
  }

  async restartBrowser() {
    const fn = 'restartBrowser';

    utils.consoleDebug(`${file} - ${fn} - Running`);
    utils.consoleDebug(`${file} - Restarting the browser`);

    await this.closePuppeteerObjects();

    this._driver = await PuppeteerHandler_Browser.createPuppeteerObject_Browser(this._languageSavedValue);

    for (const pageId of Object.keys(this._pageList)) {
      if (this._pageList[pageId]) {
        const page = await this.createPuppeteerObject_Page(this._pageList[pageId].timeOut);
        this._pageList[pageId].replacePuppeteerPageObject(page);
      }
    }
  }

  getPageById(pageId: string): PuppeteerHandler_Page | undefined {
    const fn = 'getPageById';

    utils.consoleDebug(`${file} - ${fn} - Running`);
    utils.consoleDebug(`${file} - Getting page by pageId = ${pageId}`);

    return this._pageList[pageId];
  }

  async kill() {
    const fn = 'kill';

    utils.consoleDebug(`${fn} - Running`);
    utils.consoleDebug(`${fn} - Removing pages from page list`);

    for (const pageId of Object.keys(this._pageList)) {
      await this._pageList[pageId].kill();
    }
    await this.closePuppeteerObjects();
  }
}
