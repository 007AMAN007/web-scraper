import superagent from 'superagent';

import utils from '../utils/utils';
import { humanizeDuration } from './humanDuration';

export class IsraeliGovernmentAPI<IRecordFromAPI = Record<string, string>, IParsedRecord = IRecordFromAPI> {
  readonly URL = 'https://data.gov.il/api/3/action/datastore_search';
  private _offset: number = 0;

  constructor(
    private governmentDbName: string,
    private resourceId: string,
    private numberOfRecordsPerRequest: number = 500
  ) {}

  public restartRecordIndexToTheBeginning = () => {
    this._offset = 0;
  };

  private _makeSingleRequest = async () => {
    const response = await superagent
      .get(this.URL)
      .retry(5)
      .query({ resource_id: this.resourceId })
      .query({ offset: this._offset })
      .query({ limit: this.numberOfRecordsPerRequest });

    // this._offset += this.numberOfRecordsPerRequest; // Already happens in the loop below

    return response.body;
  };

  public processAllRecords = async (
    processBatchOfRecords: (parsedRecords: Array<IParsedRecord>) => Promise<unknown>,
    parseSingleRecord: (oneRecordFromServer: IRecordFromAPI) => IParsedRecord | null
  ) => {
    // processingFunction: (oneRecordFromServer: Record<string, string>) => CacheCorporate
    const fn = `${IsraeliGovernmentAPI.name}[${this.governmentDbName}/${this.resourceId}].getNextBatchOfRecords`;
    utils.consoleLog(`${fn} - Starting...`);

    const functionStartingTimestamp = new Date();
    let totalRecordsInGovernmentDb = 0;
    let processedRecords = 0;
    let ignoredRecords = 0;

    for (
      let batchIndex = 1, isFirstLoop = true;
      isFirstLoop || this._offset < totalRecordsInGovernmentDb;
      this._offset += this.numberOfRecordsPerRequest, batchIndex++, isFirstLoop = false
    ) {
      // Starting batch...
      const batchStartTimestamp = new Date();
      let startingMessage: string;
      if (isFirstLoop) {
        startingMessage = `${fn} - Getting first batch of records...`;
      } else {
        const batchName = `${batchIndex}/${Math.ceil(totalRecordsInGovernmentDb / this.numberOfRecordsPerRequest)}`;
        startingMessage = `${fn} - Getting ${batchName} batch of records (${this._offset} records were processed so far, and ${ignoredRecords} were ignored, out of total ${totalRecordsInGovernmentDb} records)...`;
      }
      utils.consoleLog(startingMessage);

      const resp = await this._makeSingleRequest();
      totalRecordsInGovernmentDb = resp.result.total;
      const batchRecordsFromServer = resp.result.records as Array<IRecordFromAPI>; // We can assume it

      const parsedRecords: Array<IParsedRecord> = [];
      for (const oneRecordFromServer of batchRecordsFromServer) {
        const singleParsedRecord = parseSingleRecord(oneRecordFromServer);
        if (singleParsedRecord) {
          parsedRecords.push(singleParsedRecord);
        } else {
          ignoredRecords++;
        }
      }

      await processBatchOfRecords(parsedRecords);
      processedRecords += batchRecordsFromServer.length;

      // Finishing batch...
      isFirstLoop = false;
      const batchProcessingTime = new Date().getTime() - batchStartTimestamp.getTime();
      const timePerRecord = batchProcessingTime / batchRecordsFromServer.length;
      const estimatedTimeForRemainingRecords = (totalRecordsInGovernmentDb - processedRecords) * timePerRecord;
      utils.consoleLog(
        `${fn} - Batch done! An estimated time of ${humanizeDuration(estimatedTimeForRemainingRecords)} remaining`
      );
    }

    utils.consoleLog(
      `${fn} - Finished! ${processedRecords} records were processed, and ${ignoredRecords} were ignored, in ${humanizeDuration(
        new Date().getTime() - functionStartingTimestamp.getTime()
      )}!`
    );
    return true;
  };
}

// // Support XML queries (already tested and working)
// updateBanksFromGovernmentAPI = async () => {
//   const fn = BankController.name + '.updateBanksFromGovernmentAPI';
//   try {
//     const dataFromAPI = await superagent
//       .get(
//         `https://data.gov.il/dataset/banks/resource/354463f3-556a-4e69-b28e-38fe68a0be87/download/bankingcorporationshe.xml`
//       )
//       .accept('xml')
//       .parse(xml2jsParser) // add the parser function
//       .retry(5)
//       .buffer();

//     const listOfBanks: Array<IBankDetails> = (dataFromAPI.body.BANKS.BANK as Array<IBankObjectFromAPI>)
//       .filter((item) => item.Category.includes(NORMAL_BANK_TYPE_FROM_API) && !isNaN(parseInt(item.Bank_Code[0])))
//       .map((item) => ({
//         bankCode: parseInt(item.Bank_Code[0]),
//         bankFullName: item.Bank_Name[0],
//         bankNickName: item.Bank_Name[0],
//         bankWebsite: item.Internet_Address[0],
//         bankAddress: item.Address[0],
//         bankCity: item.City[0],
//         bankZipCode: parseInt(item.Zip_Code[0]),
//         bankPhone: item.Telephone[0],
//         bankFax: item.Fax[0],
//         bankSwiftCode: item.Swift_Code[0],

//         // TO DO: Should not be set from the government's API. It should allow NULL by default and be manually changed (no overridden), see US 744
//         bankEnglishName: item.Bank_Name[0],
//         bankLogoURL: 'https://placehold.co/64x64/gray/white/png',
//       }));

//     const promises = listOfBanks.map((item) => this._createBank(item));
//     return Promise.all(promises);
//   } catch (err) {
//     const strErr = `${fn} - Error: ${utils.convertToString(err)}`;
//     utils.consoleError(strErr);
//     throw new Error(strErr);
//   }
// };
