// LN
// cSpell:ignore checkperiod
import { types as utilTypes } from 'util';
import NodeCache, { Key } from 'node-cache';
import { ICustomRequest, ICustomResponse, IResponseBasic } from '../types/expressCustom';

import utils from '../utils/utils';

export class CacheService {
  // Properties
  private cache: NodeCache;

  constructor(ttlSeconds = 0) {
    const _ttl = ttlSeconds;
    this.cache = new NodeCache({ stdTTL: _ttl, checkperiod: _ttl * 0.2, useClones: false });
  }

  get<T = unknown>(key: Key, fetchFunction: () => T | Promise<T>, ttl: number = 0): Promise<T> {
    const value = this.cache.get<T>(key);
    if (value) {
      utils.consoleLog(`Cache Hit! - the following key was restored from cache: '${key}'`);
      return Promise.resolve(value);
    }

    const result = fetchFunction();
    if (utilTypes.isPromise(result)) {
      const p = (result as Promise<T>)
        .then((resultOfPromise) => {
          return resultOfPromise;
        })
        .catch((errResp) => {
          utils.consoleError(
            `Cache (catch) - the fetchFunction's error output will not be stored under the key "${key}" in cache: ${utils.convertToString(
              errResp
            )}`
          );
          throw errResp;
        });
      this.cache.set(key, p, ttl);
      return p;
    } else {
      this.cache.set(key, result, ttl);
      return Promise.resolve(result);
    }
  }

  getWithoutSetting = <T = unknown>(key: Key) => {
    return this.cache.get<T>(key);
  };

  del(keys: Key | Key[]) {
    this.cache.del(keys);
  }

  delStartWith(startStr = '') {
    if (!startStr) {
      return;
    }

    const keys = this.cache.keys();
    for (const key of keys) {
      if (key.startsWith(startStr)) {
        this.del(key);
      }
    }
  }

  flush() {
    this.cache.flushAll();
    utils.consoleLog('Cache - all keys flushed!');
  }

  // routeWrapper(originalRouteFunction: (req: ICustomRequest, res: ICustomResponse) => ICustomResponse) {
  //   return async (req: ICustomRequest, res: ICustomResponse) => {
  //     const storeFunction = () => originalRouteFunction(req, res);
  //     const key = ((req && req.user && req.user.email) || 'Anonymous') + '_' + utils.getFullUrlFromReqObj(req);
  //     const result = await this.get(key, storeFunction);
  //     if (
  //       result &&
  //       typeof result == 'object' &&
  //       'error' in result &&
  //       utils.isReallyTrue((result as { error: unknown }).error)
  //     ) {
  //       this.del(key);
  //     }
  //     return res.json((result as unknown) as IResponseBasic);
  //   };
  // }

  keys(startsWith?: string) {
    if (!startsWith) {
      return this.cache.keys();
    } else {
      const keysList = this.cache.keys();
      return keysList.filter((key) => key.startsWith(startsWith));
    }
  }

  set(key: Key, value: unknown) {
    return this.cache.set(key, value);
  }
}
