// spell-checker:ignore CMBU
import { Agenda } from 'agenda';
import { DataSource } from 'typeorm';

import utils from '../utils/utils';
import { MasavJob } from '../Jobs/MasavJob';
import { CorporateJob } from '../Jobs/CorporateJob';
import { BanksAndBranchesJob } from '../Jobs/BanksAndBranchesJob';
import { LaneCacheUpdationJob } from '../Jobs/LaneCacheUpdationJob';
import { JobBaseClass } from '../Jobs/JobBaseClass';

utils.assertEnvParams(['MONGODB_USERNAME', 'MONGODB_PASSWORD', 'MONGODB_HOSTNAME', 'MONGODB_DB_NAME']);

export const agendaMongoConnectionUrl = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOSTNAME}/${process.env.MONGODB_DB_NAME}?retryWrites=true&w=majority`;
export const AGENDA_COLLECTION_NAME = 'agendaJobs';
export const AGENDA_SCHEDULE_TIMEZONE = 'Asia/Jerusalem';

export function cronScheduleEveryWorkDayAt(hours: number, minutes: number) {
  // Example: cron schedule, sunday till friday, at 19 30 = '30 19 * * 0-5';
  return `${minutes} ${hours} * * 0-5`;
}

export function cronScheduleEveryDayAt(hours: number, minutes: number) {
  // Example: cron schedule, sunday till friday, at 19 30 = '30 19 * * 0-5';
  return `${minutes} ${hours} * * *`;
}
export class AgendaHandler {
  private agendaInstance: Agenda;

  constructor(mongoDbUrl: string) {
    this.agendaInstance = new Agenda(
      { maxConcurrency: 1, db: { address: mongoDbUrl, collection: AGENDA_COLLECTION_NAME } },
      (err) => {
        if (err) {
          utils.consoleError(`Agenda - Error occurred: ${utils.convertToString(err)}`);
        } else {
          utils.consoleLog(`Agenda - Successfully connected!`);
        }
      }
    );

    const graceful = () => {
      void this.agendaInstance.stop();
    };

    process.on('SIGTERM', graceful);
    process.on('SIGINT', graceful);

    this.agendaInstance.on('start', (job) => {
      utils.consoleLog(
        '-------------------------------------STARTED-----------------------------------------------' +
          `\nJob ${job.attrs.name} (id=${job.attrs._id}) starting...` +
          '\n-------------------------------------------------------------------------------------------'
      );
    });
    this.agendaInstance.on('complete', (job) => {
      utils.consoleLog(
        '-------------------------------------FINISHED----------------------------------------------' +
          `\nJob ${job.attrs.name} (id=${job.attrs._id}) completed successfully!` +
          '\n-------------------------------------------------------------------------------------------'
      );
    });
    this.agendaInstance.on('fail', (err, job) => {
      let addition = '';
      try {
        addition = '' + job.attrs.failReason;
      } catch (e) {
        utils.consoleError(`Agenda.on('fail') - job.attrs.failReason throws an error: ${utils.convertToString(job)}!`);
      }

      utils.consoleError(
        `Agenda.on('fail') - Error had occurred! Job=${utils.convertToString(job)}\n` +
          `Error details=${utils.convertToString(err)}\n` +
          `err.message=${utils.convertToString(err.message)}\n` +
          addition
      );
    });
  }

  async start(dbDataSource: DataSource) {
    const ALL_JOBS = [
      // new MasavJob(this.agendaInstance, dbDataSource),
      new CorporateJob(this.agendaInstance, dbDataSource),
      new BanksAndBranchesJob(this.agendaInstance, dbDataSource),
      new LaneCacheUpdationJob(this.agendaInstance, dbDataSource),
    ];

    const allJobIDsInOneString = ALL_JOBS.reduce((previousValue: string, currentJob: JobBaseClass<unknown>) => {
      return previousValue + currentJob.getJobID();
    }, '');

    const agendaTriggerList: string = process.env.AGENDA_TRIGGER_LIST || allJobIDsInOneString;
    const agendaInitList: string = (process.env.AGENDA_INIT_LIST || allJobIDsInOneString) + agendaTriggerList;
    utils.consoleLog(
      `Agenda - initializing the following jobs: <${agendaInitList}>, and triggering the following jobs: <${agendaTriggerList}>`
    );

    /**
     * The content of `jobList` is something like that:
     * {
     *   ID1: Job1_Instance,
     *   ID2: Job2_Instance,
     * }
     */
    const jobList = ALL_JOBS.reduce(
      (previousValue: Record<string, JobBaseClass<unknown>>, currentJob: JobBaseClass<unknown>) => {
        const currentJobId = currentJob.getJobID();

        if (currentJobId in previousValue) {
          const strErr = `The job ID '${currentJobId}' already exists! Make sure each job has a different job ID`;
          utils.consoleErrorAndThrow(strErr);
        }

        return {
          ...previousValue,
          [currentJobId]: currentJob,
        };
      },
      {}
    );

    // Accept work for jobs that should be initiated
    Object.keys(jobList).forEach((jobID) => {
      if (agendaInitList.includes(jobID)) {
        jobList[jobID].acceptWork();
      }
    });

    this.agendaInstance.on('ready', () => {
      // Trigger jobs that should be initiated
      Object.keys(jobList).forEach((jobID) => {
        if (agendaTriggerList.includes(jobID)) {
          void jobList[jobID].trigger({ orgId: '' });
        }
      });
    });

    return this.agendaInstance.start();
  }

  getOriginalAgendaInstance(): Agenda {
    return this.agendaInstance;
  }
}
