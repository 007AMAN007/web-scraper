import { Contacts } from '../entities/FromDB/Contacts.model';
import { DataSource, EntityManager } from 'typeorm';
import { Ledger } from '../entities/FromDB/Ledger.model';
import utils from '../utils/utils';

// Internal account is known as "Ledger Group" in the accounting software

interface IClassicalLoanLedgerData {
  borrowers: Array<Contacts>;
  internalAccountId: number;
  currencyNumericCode: number;
  startDate: string;
  financingAmount: number;
}

interface IDiscountingChequesLedgerData extends IClassicalLoanLedgerData {}

export type IILedgerData = Omit<IClassicalLoanLedgerData, 'startDate' | 'financingAmount'> & {
  startDate?: string;
  financingAmount?: number;
};
export class PriorityHandler {
  constructor(private dbDataSource: DataSource) {}

  createClassicalLoanLedger = async (
    ledgerData: IClassicalLoanLedgerData,
    transactionalEntityManager?: EntityManager
  ) => {
    const fn = `${PriorityHandler.name}.createClassicalLoanLedger`;

    try {
      const ledgerId = await this.createLedger(ledgerData, transactionalEntityManager);
      return ledgerId;
    } catch (error) {
      throw new Error(`${fn}\nError : ${utils.convertToString(error)}`);
    }
  };

  createDiscountingChequesLoanLedger = async (
    ledgerData: IDiscountingChequesLedgerData,
    transactionalEntityManager?: EntityManager
  ) => {
    const fn = `${PriorityHandler.name}.createDiscountingChequesLoanLedger`;
    try {
      const ledgerId = await this.createLedger(ledgerData, transactionalEntityManager);

      return ledgerId;
    } catch (error) {
      throw new Error(`${fn}\nError : ${utils.convertToString(error)}`);
    }
  };

  createCurrentProductLedger = async (ledgerData: IILedgerData, transactionalEntityManager?: EntityManager) => {
    const fn = `${PriorityHandler.name}.createCurrentProductLedger`;

    try {
      const ledgerId = await this.createLedger(ledgerData, transactionalEntityManager);

      return ledgerId;
    } catch (error) {
      throw new Error(`${fn}\nError : ${utils.convertToString(error)}`);
    }
  };

  private createLedger = async (
    ledgerData: IILedgerData,
    transactionalEntityManager?: EntityManager
  ): Promise<number> => {
    /* Here we will call actual accounting software API in future once ready */
    const fn = `PriorityHandler.createLedger`;
    const ledgerRepository = transactionalEntityManager
      ? transactionalEntityManager.getRepository(Ledger)
      : this.dbDataSource.getRepository(Ledger);
    try {
      const maxLedgerId = await ledgerRepository
        .createQueryBuilder('Ledger')
        .select(`MAX(Ledger.LedgerID)`)
        .getRawOne();
      return maxLedgerId.max + 1;
    } catch (error) {
      throw new Error(`${fn}\nError : ${utils.convertToString(error)}`);
    }
  };
}
