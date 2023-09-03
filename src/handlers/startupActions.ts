import utils from '../utils/utils';

export function performStartupActions() {
  process.on('unhandledRejection', (reason, promise) => {
    utils.consoleError(`---------
    Warning: Unhandled Promise Rejection!
    Reason: ${utils.convertToString(reason)}

    Usually this happens when:
    (1) Promise rejects, and there's no catch.
    (2) Promise inside a promise: The parent promise has 'catch', but the child doesn't use 'return' (which bubble up the Error/rejection to the parent).
    Also, you can catch it at the child, and re-throw a parsed error for example.
    This problem is easy to spot, because the parent Promise never resolves/rejects/finishes.
    (3) Functions with callback functions might also be dangerous if not properly returned.
    ---------`);
  });

  process.on('uncaughtException', (err) => {
    utils.consoleError('---------\nUncaught Exception at: ' + err.stack + '\n---------');
  });

  if (process.env.NODE_ENV !== 'development') {
    const _tmpEnvObj: { [key: string]: string | undefined } = {};
    Object.keys(process.env).forEach((key) => {
      if (/DATABASE_URL/i.test(key)) {
        _tmpEnvObj[key] = (process.env[key] || '').replace(/(.*?:[^/]{2}.)([^@]*)(...@.*)/, '$1***$3');
      } else if (/KEY|PASS|SECRET|TOKEN/i.test(key)) {
        _tmpEnvObj[key] = /keyword/i.test(key)
          ? process.env[key]
          : (process.env[key] || '').replace(/(.{3})(.*)(.{3})/, '$1***$3');
      } else {
        _tmpEnvObj[key] = process.env[key];
      }
    });
    utils.consoleLog(`process.env = ${JSON.stringify(_tmpEnvObj, null, 2)}\n`);
  }
}
