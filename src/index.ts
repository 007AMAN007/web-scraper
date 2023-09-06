// import puppeteer from 'puppeteer';

import IPuppeteerHandler_Browser from "./handlers/puppeteer/puppeteer-browser-handler/IPuppeteerHandler_Browser";
import PuppeteerHandler_Browser from "./handlers/puppeteer/puppeteer-browser-handler/PuppeteerHandler_Browser";
import utils from "./utils/utils";
import * as ExcelJS from "exceljs";
import * as fs from "fs";

type IMainPageResultAnalysis = {
  pageURls: string[];
};

type ILandingPageResultAnalysis = {
  tag: string;
  title: string;
  excerpt: string;
  area: string;
  energyLabel: string;
  caseNumber: string;
  type: string;
  purpose: string;
  economy: string;
  room: string;
  facilities: string;
  technique: string;
};

export class BusinessJob {
  async actuallyWork(mainPageURL: string, fileName: string) {
    try {
      let browser: IPuppeteerHandler_Browser | undefined;
      console.log(`Navigating to website...`);
      browser = await PuppeteerHandler_Browser.createNewBrowser("en", "");
      const sitePage = await browser.createNewPage("sitePage");
      await sitePage.bringToFront();
      await sitePage.navigateTo(mainPageURL);
      // await sitePage.waitForTime(10000);
      await sitePage.buttonClick(
        "#cc_div > #cm > #c-inr > #c-bns > #c-p-bn",
        "Accept Cookies"
      );
      await sitePage.waitForTime(5000);
      await sitePage.buttonClick(
        ".results__next > .results__nexttext",
        "See More"
      );
      await sitePage.waitForTime(5000);

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
      browser.closePuppeteerObjects();

      // Create a new Excel workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(fileName);

      // Define the headers based on the keys of the first object
      const headers = Object.keys(allItemsData[0]);

      // Add headers to the worksheet
      worksheet.addRow(headers);

      // Add data to the worksheet
      allItemsData.forEach((item: any) => {
        const row = headers.map((header) => item[header]);
        worksheet.addRow(row);
      });

      // Define the filename and path
      const xlFilename = `${fileName}.xlsx`;

      // Save the workbook to a file
      workbook.xlsx
        .writeFile(xlFilename)
        .then(() => {
          utils.consoleDebug(`Excel file "${xlFilename}" has been saved.`);
        })
        .catch((err) => {
          utils.consoleError(`Error saving Excel file:${err}`);
        });
    } catch (error) {
      utils.consoleError(error);
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
    const excerpt =
      divElement.querySelector(".viewprop__heading")?.textContent || "";
    const area =
      divElement
        .querySelector(".viewprop__main")
        ?.querySelector("div:nth-child(1)")?.textContent || "";
    const energyLabel =
      divElement
        .querySelector(".viewprop__main")
        ?.querySelector("div:nth-child(2)")?.textContent || "";
    let caseNumber =
      divElement.querySelector(".viewprop__caseid > span:nth-child(1)")
        ?.textContent || "";
    if (caseNumber) {
      caseNumber = caseNumber.replace("Sagsnummer: ", "");
    }

    const type =
      divElement.querySelector(".viewprop__caseid > span:nth-child(2) > a")
        ?.textContent || "";
    let purpose =
      divElement.querySelector(".viewprop__usage > div")?.textContent || "";
    if (purpose) {
      purpose = this.makeReadableStringForExcelCell(purpose);
    }

    const economy =
      divElement.querySelector(".viewprop__economy > div")?.textContent || "";
    const room =
      divElement.querySelector(".viewprop__info > div")?.textContent || "";
    const facilities =
      divElement.querySelector(".viewprop__facility > div")?.textContent || "";
    const technique =
      divElement.querySelector(".viewprop__technology > div")?.textContent ||
      "";

    const data: ILandingPageResultAnalysis = {
      tag: tag,
      title: title,
      excerpt: excerpt,
      area: area,
      energyLabel: energyLabel,
      caseNumber: caseNumber,
      type: type,
      purpose: purpose,
      economy: economy,
      room: room,
      facilities: facilities,
      technique: technique,
    };

    return Promise.resolve(data);
  }

  makeReadableStringForExcelCell(inputString: string) {
    const lines = inputString.trim().split("\n");
    const outputString = lines.join(", ");

    return outputString;
  }
}

(async () => {
  utils.consoleDebug(`Job started at:${new Date()}`);

  const businessJobInstance = new BusinessJob();
  await businessJobInstance.actuallyWork(
    "https://www.ejendomstorvet.dk/ledigelokaler/koeb",
    "koeb"
  );

  await businessJobInstance.actuallyWork(
    "https://www.ejendomstorvet.dk/ledigelokaler/leje",
    "leje"
  );

  utils.consoleDebug(`Job end at:${new Date()}`);
})();

//viewprop__economy
