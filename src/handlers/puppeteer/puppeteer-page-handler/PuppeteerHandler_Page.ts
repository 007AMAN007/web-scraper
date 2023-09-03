//cspell:ignore networkidle
import { LoadEvent, Page } from "puppeteer";

import {
  IPageViewPort,
  IPuppeteerHandler_Page,
  resultOfferPage,
} from "./IPuppeteerHandler_Page";
import { treatAsError } from "../../../utils/treatAsError";
import utils from "../../../utils/utils";

const file = "PuppeteerHandler_Page";
const DURATION_IN_MS_BETWEEN_CHECKS = 1000;
const MIN_STABLE_SIZE_ITERATIONS = 3;
export default class PuppeteerHandler_Page implements IPuppeteerHandler_Page {
  constructor(
    private page: Page,
    private removePageFromParentList: () => void,
    private restartBrowser: () => Promise<void>,
    public timeOut: number
  ) {}

  async navigateTo(url: string, waitUntil: LoadEvent = "networkidle2") {
    const fn = "navigateTo";

    utils.consoleDebug(`${file} - ${fn} - Running`);
    utils.consoleDebug(`${file} - Navigating to the url = ${url}`);

    let isSuccessFull = false;
    for (let i = 0; i < 10 && !isSuccessFull; i++) {
      try {
        await this.page.goto(url, { waitUntil });
        await this.waitTillHTMLRendered();
        isSuccessFull = true;
      } catch (e) {
        try {
          utils.consoleKnownError(
            `${file} - ${fn} - trying page reloading, because of the following error: ${utils.convertToString(
              e
            )}`
          );
          if ((treatAsError(e).stack || "").includes("ERR_NAME_NOT_RESOLVED")) {
            return;
          }
          await this.pageReload(waitUntil);
        } catch (recoveringErr) {
          utils.consoleKnownError(
            `${file} - ${fn} - Error in reloading the page because: ${utils.convertToString(
              recoveringErr
            )}`
          );
          await this.restartBrowser();
        }
      }
    }
  }

  emulateRandomMovement() {
    // this.mouseMovement();
    // this.pageScroll();
  }

  replacePuppeteerPageObject(newPageObject: Page) {
    this.page = newPageObject;
  }

  async pageReload(waitUntil: LoadEvent) {
    const fn = "pageReload";

    utils.consoleDebug(`${file} - ${fn} - Running`);
    utils.consoleDebug(
      `${file} - ${fn} - Reloading the page = ${this.getURL()}`
    );
    try {
      await this.page.reload({ waitUntil });
    } catch (e) {
      utils.consoleError(`${file} - ${fn} - Error in page reload due to: ${e}`);
    }
  }

  async clearCookiesAndStorage() {
    const fn = "clearCookiesAndStorage";

    utils.consoleDebug(`${file} - ${fn} - Running`);
    utils.consoleDebug(`${file} - ${fn} - Clear browser cache & cookies`);

    try {
      await this.page.evaluate(() => localStorage.clear());
      await this.page.evaluate(() => sessionStorage.clear());
      await this.page.deleteCookie();
    } catch (e) {
      utils.consoleError(
        `${file} - ${fn} - Error in clear cookies and storage due to: ${e}`
      );
    }
  }

  async bringToFront() {
    const fn = "bringToFront";

    utils.consoleDebug(`${file} - ${fn} - Running`);
    utils.consoleDebug(`${file} - ${fn} - Bringing page on front`);

    await this.page.bringToFront();
  }

  async takeScreenshotAndSaveInLocal(
    directoryPath: string,
    isFullPage: boolean
  ): Promise<string> {
    const fn = "takeScreenshotAndSaveInLocal";

    utils.consoleDebug(`${file} - ${fn} - Running`);
    utils.consoleDebug(
      `${file} ${fn} - Taking screenshot of page = ${this.getURL()}`
    );
    let randomImageName = "";
    try {
      randomImageName =
        Date.now() + "-" + Math.random().toString(36).substr(2, 9) + ".png";
      await this.page.screenshot({
        path: `./${directoryPath}/${randomImageName}`,
        fullPage: isFullPage,
      });
    } catch (e) {
      utils.consoleError(
        `${file} - ${fn} - Error in taking screenshot of page due to: ${utils.convertToString(
          e
        )}`
      );
    }
    return randomImageName;
  }

  async takeElementScreenshotAndSaveInLocal(
    elementSelector: string,
    directoryPath: string
  ): Promise<string> {
    const fn = "takeElementScreenshotAndSaveInLocal";

    utils.consoleDebug(`${file} - ${fn} - Running`);
    utils.consoleDebug(
      `${file} ${fn} - Taking screenshot of element on page = ${this.getURL()}`
    );

    // await this.waitForElement(elementSelector);
    const element = await this.page.$(elementSelector);

    let randomImageName = "";
    try {
      if (element) {
        randomImageName =
          Math.random().toString(36).substr(2, 9) + Date.now() + ".png";
        await element.screenshot({
          path: `./${directoryPath}/${randomImageName}`,
        });
      }
    } catch (e) {
      utils.consoleError(
        `${file} - ${fn} - Error in taking screenshot of element due to: ${e}`
      );
    }
    return randomImageName;
  }

  async buttonClick(btnSelector: string, btnName: string, isDblClick = false) {
    const fn = "buttonClick";

    utils.consoleDebug(`${file} - ${fn} - Running`);
    utils.consoleDebug(
      `${file} - ${fn} - Clicking on button ${btnName} on page = ${this.getURL()}`
    );

    try {
      await this.page.waitForSelector(btnSelector);
      await this.page.click(btnSelector, { clickCount: isDblClick ? 2 : 1 });
    } catch (err) {
      if (treatAsError(err).name === "TimeoutError") {
        utils.consoleDebug(
          `${file} - ${fn} - Error in clicking the ${btnName} this is due to ${btnName} not found on page`
        );
      } else {
        utils.consoleError(
          `${file} - ${fn} - Error in clicking the ${btnName}, due to: ${utils.convertToString(
            err
          )}`
        );
      }
    }
  }

  async waitForTime(time: number) {
    const fn = "waitForTime";

    utils.consoleDebug(`${file} - ${fn} - Running`);
    utils.consoleDebug(
      `${file} - ${fn} - Waiting for timeout of ${time} milliseconds on page = ${this.getURL()}`
    );

    await this.page.waitForTimeout(time);
  }

  async waitForElement(element: string) {
    const fn = "waitForElement";

    utils.consoleDebug(`${file} - ${fn} - Running`);
    utils.consoleDebug(
      `${file} - ${fn} - Waiting for an element = ${element} to be ready on page = ${this.getURL()}`
    );

    await this.page.waitForSelector(element);
  }

  async checkIfElementExist(elementToVerify: string): Promise<boolean> {
    const fn = "checkIfElementExist";

    utils.consoleDebug(`${file} - ${fn} - Running`);
    utils.consoleDebug(
      `${file} - ${fn} - Checking if element = ${elementToVerify} on page = ${this.getURL()}`
    );

    const doesExists = await this.page.evaluate(
      async (_elementToVerify: string) => {
        const element = document.querySelector(_elementToVerify);
        return Boolean(element);
      },
      elementToVerify
    );
    return doesExists;
  }

  async innerWidth(): Promise<number> {
    const fn = "innerWidth";

    utils.consoleDebug(`${fn} - Running`);
    utils.consoleDebug(
      `${fn} -  Getting  inner width of page = ${this.getURL()}`
    );

    const innerWidth = await this.page.evaluate(() => {
      return window.innerWidth;
    });
    return innerWidth;
  }

  async innerHeight(): Promise<number> {
    const fn = "innerHeight";

    utils.consoleDebug(`${fn} - Running`);
    utils.consoleDebug(
      `${fn} -  Getting  inner height of page = ${this.getURL()}`
    );

    const innerHeight = await this.page.evaluate(() => {
      return window.innerHeight;
    });
    return innerHeight;
  }

  async getViewPort(): Promise<IPageViewPort> {
    const fn = "getViewPort";

    utils.consoleDebug(`${fn} - Running`);
    utils.consoleDebug(
      `${fn} -  Getting  view port settings of page = ${this.getURL()}`
    );

    const deviceViewPort = this.page.evaluate(() => {
      const viewPort: IPageViewPort = {
        width: window.innerWidth,
        height: window.innerHeight,
        deviceScaleFactor: Math.round(window.devicePixelRatio),
      };
      return viewPort;
    });
    return deviceViewPort;
  }

  async getUserAgent(): Promise<string> {
    const fn = "getUserAgent";

    utils.consoleDebug(`${fn} - Running`);
    utils.consoleDebug(
      `${fn} -  Getting  user agent of page = ${this.getURL()}`
    );

    return await this.page.evaluate(() => navigator.userAgent);
  }

  async scroll(XYCoordinate: number) {
    const fn = "scroll";

    utils.consoleDebug(`${fn} - Running`);
    utils.consoleDebug(
      `${fn} -  Scrolling on page = ${this.getURL()} with XYCoordinate = ${XYCoordinate}`
    );

    try {
      await this.page.evaluate(async (_XYCoordinate) => {
        window.scrollBy({
          top: _XYCoordinate,
          behavior: "smooth",
        });
      }, XYCoordinate);
    } catch (error) {
      utils.consoleError(
        `${fn} - ${file} Error on page scrolling due to: ${error}`
      );
    }
  }

  async getPageEvaluateResult<T>(
    pageResult: (...args: string[]) => Promise<T>,
    ...args: string[]
  ): Promise<T> {
    const result = await this.page.evaluate(pageResult, ...args);
    return result;
  }

  async offerPageResult() {
    await this.page.evaluate(() => {
      const elements = document.querySelectorAll(
        "*[onclick],*[onClick],*[href], button"
      ) as NodeListOf<HTMLElement>;
      // for (const element of elements) {
      //   element.click();
      // }
    });
  }

  async fillInput(elementSelector: string, textToInput: string) {
    const fn = "fillInput";

    utils.consoleDebug(`${file} - ${fn} - Running`);
    utils.consoleDebug(
      `${file} - ${fn} - Filling input ${elementSelector} with text ${textToInput} on page = ${this.getURL()}`
    );

    try {
      await this.page.type(elementSelector, textToInput);
    } catch (error) {
      utils.consoleError(
        `${fn} - ${file} Error while filling input ${elementSelector}: ${error}`
      );
    }
  }

  mouseMovement() {
    // const innerWidth = this.innerWidth(this.page);
    // const innerHeight = this.innerWidth(this.page);
  }

  async waitTillHTMLRendered(timeout: number = 60000) {
    const fn = "waitTillHTMLRendered";

    utils.consoleDebug(`${fn} - Running`);
    utils.consoleDebug(`${fn} -  Waiting Till HTML to be Rendered`);

    // await page.waitForSelector('body');
    await this.waitForTime(15000);

    const maxChecks = timeout / DURATION_IN_MS_BETWEEN_CHECKS;
    let lastHTMLSize = 0;
    let countStableSizeIterations = 0;
    let wasRendered: boolean = false;

    for (
      let checkCounts = 1;
      checkCounts <= maxChecks && !wasRendered;
      checkCounts++
    ) {
      const html = await this.page.content();
      const currentHTMLSize = html.length;

      if (lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize)
        countStableSizeIterations++;
      else countStableSizeIterations = 0; // reset the counter

      if (countStableSizeIterations >= MIN_STABLE_SIZE_ITERATIONS) {
        utils.consoleDebug("Page rendered fully..");
        wasRendered = true;
      }

      lastHTMLSize = currentHTMLSize;
      await this.page.waitForTimeout(DURATION_IN_MS_BETWEEN_CHECKS);
    }
  }

  getURL(): string {
    return this.page.url();
  }

  getArrayOfRedirectURLs(): string[] {
    const redirectUrlsResponse: string[] = [];
    let count = 0;
    this.page.on("request", (request) => {
      if (
        request.isNavigationRequest() &&
        request.resourceType() === "document"
      ) {
        if (count > 0) {
          redirectUrlsResponse.push(request.url());
        }
        count++;
      }
    });
    return redirectUrlsResponse;
  }

  public async closePuppeteerObject() {
    // TODO: Change to protected after moving to a separated package
    const fn = "closePuppeteerObject";

    utils.consoleDebug(`${fn} - Running`);
    utils.consoleDebug(`${fn} -  Closing browser page`);

    if (!this.page.isClosed()) {
      await this.page.close();
    }
  }

  public async kill() {
    const fn = "kill";

    utils.consoleDebug(`${fn} - Running`);
    utils.consoleDebug(
      `${fn} -  Closing browser page & removing all browser cookies`
    );

    await this.clearCookiesAndStorage();
    await this.closePuppeteerObject();
    this.removePageFromParentList();
  }
}
