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
  // tag: string;
  // title: string;
  // excerpt: string;
  // area: string;
  // energyLabel: string;
  // caseNumber: string;
  // type: string;
  // purpose: string;
  // economy: string;
  // room: string;
  // facilities: string;
  // technique: string;
  "Type til leje": string;
  Adresse: string;
  Postnummer: number;
  By: string;
  Beskrivelse: string;
  Areal: number;
  Energikategori: string;
  Type: string;
  Benyttelse: string;
  "Leje pr aar"?: number;
  "Driftsudgifter pr aar"?: number;
  "Etage areal": string | number;
  Sekundært: string | number;
  "Grund areal": string | number;
  Faciliteter: string;
  Teknik: string;
  "Pris i kr."?: string | number;
  "Årlige lejeindtægt kr."?: string | number;
  "Pris pr. m² kr."?: string | number;
  "Årlige lejeindtægt pr. m² kr."?: string | number;
  "Årlige driftsudgifter kr. "?: string | number;
  "Årlige driftsudgifter pr. m² kr."?: string | number;
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
      let seeMoreButtonExists = true;
      const seeMoreButtonElement = ".results__next > .results__nexttext";
      while (seeMoreButtonExists) {
        seeMoreButtonExists = await sitePage.checkIfElementExist(
          seeMoreButtonElement
        );
        if (seeMoreButtonExists) {
          await sitePage.buttonClick(seeMoreButtonElement, "See More");
        }
      }

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
          ".content-flex",
          fileName
        );
        allItemsData.push(result);
      }
      browser.closePuppeteerObjects();

      // Create a new Excel workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(fileName, {
        views: [{ state: "frozen", ySplit: 1 }],
      });

      // Define the headers based on the keys of the first object
      const headers = Object.keys(allItemsData[0]);

      // Add headers to the worksheet
      worksheet.addRow(headers);

      // Add data to the worksheet
      allItemsData.forEach((item: any) => {
        const row = headers.map((header) => item[header]);
        worksheet.addRow(row);
      });

      // Dynamically adjust column widths based on content
      worksheet.columns.forEach((column: any) => {
        if (column) {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, (cell: any) => {
            const cellValue = cell.text ? cell.text : ""; // Get cell text
            const columnLength = cellValue.toString().length;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
          column.width = maxLength + 2; // Add some padding
        }
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
    divSelector: string,
    fileName: string
  ): Promise<ILandingPageResultAnalysis> {
    const makeReadableStringWithCommaForExcelCell = (inputString: string) => {
      const lines = inputString.trim().split("\n");
      const outputString = lines.join(", ");
      const filteredString = outputString
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "")
        .join(", ");

      return filteredString;
    };

    const trimAndRemoveWhiteSpacesFromString = (inputString: string) => {
      const cleanedString = inputString.trim();
      const formattedString = cleanedString.replace(/\s+/g, " ");

      return formattedString;
    };

    const divElement = document.querySelector(divSelector) as HTMLElement;

    const tag = divElement.querySelector(".viewprop__type")?.textContent || "";
    const title = divElement.querySelector("h1")?.textContent || "";
    const excerpt =
      divElement.querySelector(".viewprop__heading")?.textContent || "";
    const area =
      divElement
        .querySelector(".viewprop__main")
        ?.querySelector("div:nth-child(1)")?.textContent || "";
    let energyLabel =
      divElement
        .querySelector(".viewprop__main")
        ?.querySelector("div:nth-child(2)")?.textContent || "";
    if (energyLabel) {
      energyLabel = trimAndRemoveWhiteSpacesFromString(energyLabel);
    }
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
      purpose = makeReadableStringWithCommaForExcelCell(purpose);
    }

    let economy =
      divElement.querySelector(".viewprop__economy > div")?.textContent || "";
    if (economy) {
      economy = trimAndRemoveWhiteSpacesFromString(economy);
    }
    let room =
      divElement.querySelector(".viewprop__info > div")?.textContent || "";
    if (room) {
      room = trimAndRemoveWhiteSpacesFromString(room);
    }
    let facilities =
      divElement.querySelector(".viewprop__facility > div")?.textContent || "";
    if (facilities) {
      facilities = makeReadableStringWithCommaForExcelCell(facilities);
    }
    let technique =
      divElement.querySelector(".viewprop__technology > div")?.textContent ||
      "";
    if (technique) {
      technique = makeReadableStringWithCommaForExcelCell(technique);
    }

    /* Calculation for room -- start */
    const floorAreaMatch = room.match(/Etage areal (\d+) m²/);
    const secondaryAreaMatch = room.match(/Sekundært areal (\d+) m²/);
    const groundAreaMatch = room.match(/Grund areal (\d+) m²/);
    /* Calculation for room -- end  */

    /* Calculation for title -- start */
    const lastCommaIndex = title.lastIndexOf(",");
    const address = title.slice(0, lastCommaIndex).trim();
    const remainingString = title.slice(lastCommaIndex + 1);
    const parts = remainingString.trim().split(" ");
    /* Calculation for title -- start */

    if (fileName === "leje") {
      /* Calculation for economy -- start */
      const annualLeaseMatches = economy.match(/Årlig leje (\d+\.?\d*)/);
      const annualOperatingCostsMatches = economy.match(
        /Årlige driftsudgifter kr\. (\d+\.?\d*)/
      );

      let annualLeaseValue = "";
      let annualOperatingCostsValue = "";

      if (annualLeaseMatches) {
        annualLeaseValue = annualLeaseMatches[1].replace(".", "");
      }

      if (annualOperatingCostsMatches) {
        annualOperatingCostsValue = annualOperatingCostsMatches[1].replace(
          ".",
          ""
        );
      }
      /* Calculation for economy -- end  */

      const data: ILandingPageResultAnalysis = {
        "Type til leje": tag,
        Adresse: address,
        Postnummer: Number(parts[0].trim()),
        By: parts.slice(1).join(" ").trim(),
        Beskrivelse: excerpt,
        Areal: Number(area.match(/\d+/)),
        Energikategori: energyLabel.split(" ")[0],
        Type: type,
        Benyttelse: purpose,
        "Leje pr aar": Number(annualLeaseValue),
        "Driftsudgifter pr aar": Number(annualOperatingCostsValue),
        "Etage areal": floorAreaMatch ? Number(floorAreaMatch[1]) : "",
        Sekundært: secondaryAreaMatch ? Number(secondaryAreaMatch[1]) : "",
        "Grund areal": groundAreaMatch ? Number(groundAreaMatch[1]) : "",
        Faciliteter: facilities,
        Teknik: technique,
      };
      return Promise.resolve(data);
    } else {
      /* Calculation for economy -- start */
      const regex = /(\d[\d\.]*)\,-/g;
      const matches = economy.match(regex);
      /* Calculation for economy -- end  */

      const data: ILandingPageResultAnalysis = {
        "Type til leje": tag,
        Adresse: address,
        Postnummer: Number(parts[0].trim()),
        By: parts.slice(1).join(" ").trim(),
        Beskrivelse: excerpt,
        Areal: Number(area.match(/\d+/)),
        Energikategori: energyLabel.split(" ")[0],
        Type: type,
        Benyttelse: purpose,
        "Pris i kr.":
          matches && matches[0]
            ? parseFloat(matches[0].replace(/\./g, "").replace(",", "."))
            : "",
        "Årlige lejeindtægt kr.":
          matches && matches[1]
            ? parseFloat(matches[1].replace(/\./g, "").replace(",", "."))
            : "",
        "Pris pr. m² kr.":
          matches && matches[2]
            ? parseFloat(matches[2].replace(/\./g, "").replace(",", "."))
            : "",
        "Årlige lejeindtægt pr. m² kr.":
          matches && matches[3]
            ? parseFloat(matches[3].replace(/\./g, "").replace(",", "."))
            : "",
        "Årlige driftsudgifter kr. ":
          matches && matches[4]
            ? parseFloat(matches[4].replace(/\./g, "").replace(",", "."))
            : "",
        "Årlige driftsudgifter pr. m² kr.":
          matches && matches[5]
            ? parseFloat(matches[5].replace(/\./g, "").replace(",", "."))
            : "",
        "Etage areal": floorAreaMatch ? Number(floorAreaMatch[1]) : "",
        Sekundært: secondaryAreaMatch ? Number(secondaryAreaMatch[1]) : "",
        "Grund areal": groundAreaMatch ? Number(groundAreaMatch[1]) : "",
        Faciliteter: facilities,
        Teknik: technique,
      };
      return Promise.resolve(data);
    }
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
