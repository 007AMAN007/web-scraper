import Decimal from 'decimal.js';

import {
  ILoanInstruction,
  validateInstruction,
  NominalInterest,
  fixInstructionsWhichHaveInvalidValues,
  BALANCE_TYPE_FOR_PLAY_SCHEDULE,
  ENGINE_VERSION,
  IAmountAndDate,
  IAmountAndDate_withNote,
  IDateString,
  IFinancialIndexEntry,
  IInstallment_deprecated,
  ILoanCalculationOptions,
  ILoanOutputWithSquashedNonBusinessDelays,
  ILoanProductInput,
  LoanProductWrapper_squash,
  NonBusinessDays,
  utils,
  convertAllLoanInstructionsToInstallments,
} from '@habankaim/lms_engine';
import { LoanInstruction } from '../entities/FromDB/LoanInstruction.model';

export interface ISimplifiedLoanCalculatedDetails_scheduleLine {
  serialNumber: number;
  date: IDateString;
  beforeBalance_Total: number;
  plannedPrincipalRepayment: number;
  plannedInterestRepayment: number;
  plannedFeesRepayment: number;
  plannedArrearsRepayment: number;
  plannedVatRepayment: number;
  plannedInterestAndPrincipalRepayment: number;
  plannedTotalRepayment: number;
  afterBalance_deferredInterest: number;
  afterBalance_arrears: number;
  afterBalance_fees: number;
  afterBalance_Total: number;
}

export interface ISimplifiedDealCalculatedDetails
  extends Omit<ILoanOutputWithSquashedNonBusinessDelays<BALANCE_TYPE_FOR_PLAY_SCHEDULE>, 'schedule'> {
  schedule: Array<ISimplifiedLoanCalculatedDetails_scheduleLine>;
}

export const convertLoanInstructionsToInstallments = (
  loanInstructions_dbFormat: Array<LoanInstruction>,
  plannedInterestRate: number,
  startDate: Date
) => {
  const loanInstructions_engineFormat: Array<ILoanInstruction> = loanInstructions_dbFormat.map((item) => {
    const loanInstructionItem: Record<string, unknown> = {
      numberOfPeriods: item.numberOfPeriods,
      typeOfInstruction: item.typeOfInstruction,
    };
    if (item.periodsForPaymentCalculation) {
      loanInstructionItem.periodsForPaymentCalculation = item.periodsForPaymentCalculation;
    }
    if (item.dayOfMonth) {
      loanInstructionItem.dayOfMonth = item.dayOfMonth;
    }
    if (item.amount) {
      loanInstructionItem.amount = item.amount;
    }
    if (!validateInstruction(loanInstructionItem)) {
      throw new Error('invalid instruction');
    }
    return loanInstructionItem;
  });

  const installments_engineFormat = convertAllLoanInstructionsToInstallments(
    fixInstructionsWhichHaveInvalidValues(loanInstructions_engineFormat),
    startDate,
    new NominalInterest(plannedInterestRate)
  ).installmentList;

  return installments_engineFormat;
};

export const engineLoanProcessing = async (input: {
  plannedInterestRate: number;
  arrearsInterestRate: number;
  isAffectedByPrime: boolean;
  startDate: Date;
  installments: Array<IInstallment_deprecated>;
  currentDate: Date;
  actualPayments: Array<IAmountAndDate>;
  feeRecords: Array<IAmountAndDate_withNote<Date | IDateString>>;
  waivers: Array<IAmountAndDate_withNote>;
  vatRate: {
    changes: Array<{
      date: Date;
      value: number;
    }>;
    initialValue: number;
  };
  primeRateHistory:
    | undefined
    | {
        changes: Array<IFinancialIndexEntry<IDateString>>;
        initialValue: number;
      };
  nonBusinessDaysEngineObject: NonBusinessDays;
  playScheduleOptions?: Partial<ILoanCalculationOptions>;
}): Promise<ILoanOutputWithSquashedNonBusinessDelays<BALANCE_TYPE_FOR_PLAY_SCHEDULE>> => {
  const options: ILoanCalculationOptions = {
    considerCurrentDatePaymentAsPaid: true,
    considerFuturePlannedPaymentsAsPaid: true,
    showEmptyInstallmentRows: true,
    showActuallyPaidRows: true,
    showTodayRow: true,
    showNegativeRows: true,
    showStateAfterOfOriginalInstallmentDate_InCaseOfNonBusinessDayDelay: true,
    ...input.playScheduleOptions,
  };

  const loanProductInput: ILoanProductInput = {
    startDate: input.startDate,
    currentDate: input.currentDate,
    plannedInterestRate: input.plannedInterestRate,
    arrearsInterestRate: input.arrearsInterestRate,
    installments: input.installments,
    fees: input.feeRecords,
    actualPayments: input.actualPayments,
    actualWaivers: input.waivers,
    vatRate: input.vatRate,
    affectedByPrimeRate: input.plannedInterestRate && input.isAffectedByPrime ? input.primeRateHistory : undefined,
    nonBusinessDays: input.nonBusinessDaysEngineObject.printContent(),
    options,
  };

  utils.consoleLog(
    `Generating a loan with the following data (engine v${ENGINE_VERSION}): ${utils.convertToString(
      loanProductInput,
      false
    )}`
  );

  return LoanProductWrapper_squash(loanProductInput);
};

export const simplifyDealCalculatedDetails = (
  dealCalculatedDetails: ILoanOutputWithSquashedNonBusinessDelays<BALANCE_TYPE_FOR_PLAY_SCHEDULE>,
  serialNumberStartFromOne?: boolean
) => {
  const schedule: Array<ISimplifiedLoanCalculatedDetails_scheduleLine> = [];
  for (const [index, line] of dealCalculatedDetails.schedule.entries()) {
    const plannedPrincipalRepayment = line.paid.MAIN.principal;
    const plannedInterestRepayment = new Decimal(line.paid.MAIN.TOTAL_INTEREST)
      .plus(line.paid.AMOUNT_DUE.TOTAL_INTEREST)
      .toNumber();
    const plannedFeesRepayment = line.paid.FEES.TOTAL_WITHOUT_VAT || 0;
    const plannedArrearsRepayment = line.paid.ARREARS.TOTAL;
    const plannedVatRepayment = line.paid.ALL_VAT || 0;

    schedule.push({
      serialNumber: serialNumberStartFromOne ? index + 1 : index,
      date: new Date(line.date).toISOString().split('T')[0],
      beforeBalance_Total: line.stateBefore.TOTAL,
      plannedPrincipalRepayment,
      plannedInterestRepayment,
      plannedFeesRepayment,
      plannedArrearsRepayment,
      plannedVatRepayment,
      plannedInterestAndPrincipalRepayment: new Decimal(plannedPrincipalRepayment)
        .plus(plannedInterestRepayment)
        .toNumber(),
      plannedTotalRepayment: new Decimal(plannedPrincipalRepayment)
        .plus(plannedInterestRepayment)
        .plus(plannedFeesRepayment)
        .plus(plannedArrearsRepayment)
        .plus(plannedVatRepayment)
        .toNumber(),
      afterBalance_deferredInterest: new Decimal(line.stateAfter.MAIN.TOTAL_INTEREST)
        .plus(line.stateAfter.AMOUNT_DUE.TOTAL_INTEREST)
        .toNumber(),
      afterBalance_arrears: line.stateAfter.ARREARS.TOTAL,
      afterBalance_fees: line.paid.FEES.TOTAL,
      afterBalance_Total: line.stateAfter.TOTAL,
    });
  }

  const simplifiedDealCalculatedDetails: ISimplifiedDealCalculatedDetails = {
    ...dealCalculatedDetails,
    schedule,
  };

  return simplifiedDealCalculatedDetails;
};
