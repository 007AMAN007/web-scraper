// import puppeteer from 'puppeteer';

import IPuppeteerHandler_Browser from "./handlers/puppeteer/puppeteer-browser-handler/IPuppeteerHandler_Browser";
import PuppeteerHandler_Browser from "./handlers/puppeteer/puppeteer-browser-handler/PuppeteerHandler_Browser";
import utils from "./utils/utils";

type IPageResultAnalysis = {
  pageURls: string[];
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

      const allURLs = await sitePage.getPageEvaluateResult(
        this.pageResult,
        ".propcontainer"
      );

      //browser.closePuppeteerObjects();
    } catch (error) {
      console.log(error);
    }
  }

  async pageResult(linkSelector: string): Promise<IPageResultAnalysis> {
    const allLinkElements = document.querySelectorAll(linkSelector) as any;
    for (const linkElement of allLinkElements) {
      utils.consoleDebug(linkElement);
    }

    const data: IPageResultAnalysis = {
      pageURls: [],
    };

    return Promise.resolve(data);
  }
}

(async () => {
  const businessJobInstance = new BusinessJob();
  await businessJobInstance.actuallyWork();
})();
