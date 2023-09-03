import * as Oso from 'oso';
import path from 'path';
import { Options } from 'oso/dist/src/types';

import utils from '../utils/utils';
import { ICustomRequest, ICustomResponse, IParams, IResponseBasic } from '../types/expressCustom';
import { ORG_ACTIONS } from '../entities/Organization.model';
import { GENERAL_ACTIONS } from '../APIs/App';

// The 'any' type here is because a bug in TypeScript. If replacing it with unknown doesn't create a problem - then go for it!
// https://www.simonholywell.com/post/typescript-constructor-type.html
// eslint-disable-next-line @typescript-eslint/ban-types
type IAnyClass<T extends {} = {}> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]) => T;

export class OsoHqHandler {
  private oso: Oso.Oso;
  private wasInitialized = false;

  constructor(private registeredClasses: IAnyClass[], private polarFilesLocations: Array<string>) {
    const options: Options = {};
    if (process.env.POLAR_LOG) {
      // We don't make any change to the defaultEqualityFn, other than adding error log
      options.equalityFn = (x, y) => {
        const doesOsoConsiderItEqual = Oso.defaultEqualityFn(x, y);
        if (x == y && !doesOsoConsiderItEqual) {
          utils.consoleError(
            `Oso.equalityFn - Error! The two items are not equal: x = ${x} (${
              // eslint-disable-next-line @typescript-eslint/ban-types
              (x as object)?.constructor?.name || typeof x
              // eslint-disable-next-line @typescript-eslint/ban-types
            }), y = ${y} (${(y as object)?.constructor?.name || typeof y})`
          );
        }
        return doesOsoConsiderItEqual;
      };
    }

    this.oso = new Oso.Oso(options);

    for (const _class of registeredClasses) {
      let nameOfClass: string;
      if ('modelName' in _class) {
        // Now it's safe to assume '_class' has a field called 'modelName'
        nameOfClass = ((_class as unknown) as { modelName: string }).modelName;
      } else if ('name' in _class) {
        nameOfClass = (_class as { name: string }).name;
      } else {
        throw new Error(`initOsoHQ - Error: Class ${utils.convertToString(_class)} don't have a proper name`);
      }
      this.oso.registerClass(_class, { name: nameOfClass });
    }
  }

  init = async () => {
    utils.consoleLog('OsoHQ - Loading Polar files...');
    const pathsOfPolarFiles = this.polarFilesLocations.map((relativePath) => {
      return relativePath.startsWith(__dirname) ? relativePath : path.join(__dirname, relativePath);
    });
    await this.oso.loadFiles(pathsOfPolarFiles).then(() => {
      this.wasInitialized = true;
      utils.consoleLog(`OsoHQ - Initialized! ${process.env.POLAR_LOG ? `(POLAR_LOG=${process.env.POLAR_LOG})` : ''}`);
    });
    return this;
  };

  authorizeRequest = async <T extends IResponseBasic, P extends IParams>(
    req: ICustomRequest<P>,
    res: ICustomResponse<T>,
    action: ORG_ACTIONS | GENERAL_ACTIONS,
    resource: unknown,
    performIfAllowed: (...args: unknown[]) => unknown
  ) => {
    const actor = req.user;
    return this.authorizeAction(actor, action, resource, performIfAllowed, (errorNumber: number) => {
      let fn = 'Oso.authorizeRequest';
      if (res.req) {
        fn += ` "${req.path}" (${req.id})`;
      } else {
        utils.consoleError(
          `res.req is false! ${utils.convertToString({
            res,
            actor,
            action,
            resource,
            performIfAllowed: performIfAllowed.toString(),
          })}`
        );
      }
      utils.consoleLog(
        `${fn} - Error: errorNumber=${errorNumber}, details=${utils.convertToString({ actor, action, resource })}`
      );
      return res.sendStatus(errorNumber);
    });
  };

  authorizeAction = async <T, K>(
    actor: unknown,
    action: ORG_ACTIONS | GENERAL_ACTIONS,
    resource: unknown,
    performIfAllowed: () => T,
    performIfDenied: (errorNumber: number) => K
  ) => {
    this._assertInitialization();
    let errorNumber = 0;
    this._makeSureInstanceOfARegisteredClass(actor);
    if (typeof resource !== 'string') {
      this._makeSureInstanceOfARegisteredClass(resource);
    }
    try {
      await this.oso.authorize(actor, action, resource, { checkRead: true });
    } catch (e) {
      if (e instanceof Oso.NotFoundError) {
        errorNumber = 404;
      } else if (e instanceof Oso.ForbiddenError) {
        errorNumber = 403;
      } else {
        throw e;
      }
    }
    if (errorNumber) {
      const fn: string = 'Oso.authorize';
      // utils.consoleError(
      //   `${fn} - Error: errorNumber=${errorNumber}, details=${utils.convertToString({ action, resource, actor })}`
      // );
      const resultWhenDenied = performIfDenied && performIfDenied(errorNumber);
      return resultWhenDenied;
    } else {
      return performIfAllowed();
    }
  };

  private _makeSureInstanceOfARegisteredClass = (object: unknown) => {
    this._assertInitialization();
    let isInstanceOfARegisteredClass = false;

    for (const _class of this.registeredClasses) {
      if (object instanceof _class) {
        isInstanceOfARegisteredClass = true;
      }
    }

    if (!isInstanceOfARegisteredClass) {
      throw new Error(
        `OsoHq.authorize - Error: (!isInstanceOfARegisteredClass) is true! ${utils.convertToString({
          isInstanceOfARegisteredClass,
          object,
        })}`
      );
    }
  };

  private _assertInitialization = () => {
    if (!this.wasInitialized) {
      const strErr = `OsoHqHandler - Error: The 'init()' function was never called!`;
      utils.consoleError(strErr);
      throw new Error(strErr);
    }
  };
}
