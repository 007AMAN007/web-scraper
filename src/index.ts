// import puppeteer from 'puppeteer';

import IPuppeteerHandler_Browser from "./handlers/puppeteer/puppeteer-browser-handler/IPuppeteerHandler_Browser";
import PuppeteerHandler_Browser from "./handlers/puppeteer/puppeteer-browser-handler/PuppeteerHandler_Browser";
import utils from "./utils/utils";
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';

type IMainPageResultAnalysis = {
  pageURls: string[];
};

type ILandingPageResultAnalysis = {
  tag: string;
  title: string;
};

export class BusinessJob {
  async actuallyWork() {
    try {
      let browser: IPuppeteerHandler_Browser | undefined;
      console.log(`Navigating to website...`);
      browser = await PuppeteerHandler_Browser.createNewBrowser("en", "");
      const sitePage = await browser.createNewPage("sitePage");
      await sitePage.bringToFront();
      await sitePage.navigateTo(
        "https://www.ejendomstorvet.dk/ledigelokaler/koeb"
      );
      await sitePage.waitForTime(10000);
      await sitePage.buttonClick(
        "#cc_div > #cm > #c-inr > #c-bns > #c-p-bn",
        "Accept Cookies"
      );
      await sitePage.waitForTime(10000);
      await sitePage.buttonClick(
        ".results__next > .results__nexttext",
        "See More"
      );
      await sitePage.waitForTime(10000);

      const pageResult = await sitePage.getPageEvaluateResult(
        this.mainPageResult,
        ".propcontainer"
      );

      const allItemsData = [];
      for (const url of pageResult.pageURls) {
        await sitePage.navigateTo(url);
        const result = await sitePage.getPageEvaluateResult(
          this.landingPageResult,
          ".content-flex"
        );
        allItemsData.push(result);
      }

      utils.consoleDebug(allItemsData);
      browser.closePuppeteerObjects();
    } catch (error) {
      console.log(error);
    }
  }

  async mainPageResult(linkSelector: string): Promise<IMainPageResultAnalysis> {
    const allDivElements = document.querySelectorAll(
      linkSelector
    ) as NodeListOf<HTMLElement>;
    const URLs: any = [];
    for (const divElement of allDivElements) {
      const aTag = divElement.querySelector("a");
      if (aTag) {
        URLs.push(aTag.getAttribute("href"));
      }
    }

    const data: IMainPageResultAnalysis = {
      pageURls: URLs,
    };

    return Promise.resolve(data);
  }

  async landingPageResult(
    divSelector: string
  ): Promise<ILandingPageResultAnalysis> {
    const divElement = document.querySelector(divSelector) as HTMLElement;

    const tag = divElement.querySelector(".viewprop__type")?.textContent || "";
    const title = divElement.querySelector("h1")?.textContent || "";

    const data: ILandingPageResultAnalysis = {
      tag: tag,
      title: title,
    };

    return Promise.resolve(data);
  }
}

(async () => {
  const businessJobInstance = new BusinessJob();
  await businessJobInstance.actuallyWork();
})();
