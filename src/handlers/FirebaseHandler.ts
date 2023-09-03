// spell-checker:ignore onrender
import superagent from 'superagent';
import FirebaseAdmin from 'firebase-admin';
import { FirebaseAPIs } from 'firebase-express-dashboard';
import path from 'path';
import fs from 'fs';

import { treatAsError } from '../utils/treatAsError';
import { ICustomRequest, ICustomResponse, ICustomNextFunction, IResponseBasic, IParams } from '../types/expressCustom';
import utils from '../utils/utils';
import { User } from '../entities/User.model';
import IFirebaseHandler, { ClaimsArray } from './IFirebaseHandler';

let firebaseJsonFile: string = '';
const pathOfFile = path.resolve(__dirname, '../../..', 'firebaseAuthServiceAccount.json');
if (fs.existsSync(pathOfFile)) {
  firebaseJsonFile = fs.readFileSync(pathOfFile, 'utf8');
}

const serviceAccount: FirebaseAdmin.AppOptions = JSON.parse(firebaseJsonFile || process.env.FIREBASE_SECRETS || '{}');
const projectId = serviceAccount
  ? (serviceAccount as { project_id?: string }).project_id || (serviceAccount as { projectId?: string }).projectId || ''
  : '';
utils.consoleDebug(`Firebase Auth - Connecting to project '${projectId}'`);

export default class FirebaseHandler implements IFirebaseHandler {
  firebaseInstance: FirebaseAdmin.app.App;

  constructor() {
    utils.assertEnvParams(['FIREBASE_WEB_API', 'FIREBASE_SECRETS']);
    this.firebaseInstance = FirebaseAdmin.initializeApp({
      credential: FirebaseAdmin.credential.cert(serviceAccount as FirebaseAdmin.AppOptions),
    });
  }

  getInstance = (): FirebaseAdmin.app.App => {
    if (!this.firebaseInstance) {
      this.firebaseInstance = FirebaseAdmin.initializeApp({
        credential: FirebaseAdmin.credential.cert(serviceAccount as FirebaseAdmin.AppOptions),
        // databaseURL: FIREBASE_SECRETS.databaseURL,
      });
    }
    return this.firebaseInstance;
  };

  whitelistRequest = <P extends IParams>(req: ICustomRequest<P>, res: ICustomResponse, next: ICustomNextFunction) => {
    res.whitelisted = true;
    return next();
  };

  decodeAndVerifyJwtToken = (idToken: string): Promise<FirebaseAdmin.auth.DecodedIdToken> => {
    const result = this.firebaseInstance.auth().verifyIdToken(idToken);
    return result;
  };

  middleware = async <P extends IParams>(req: ICustomRequest<P>, res: ICustomResponse, next: ICustomNextFunction) => {
    if (res.whitelisted) {
      delete res.whitelisted;
      return next();
    } else {
      const user = await this.extractUserFromRequest(req);
      if (user) {
        req.user = user;
        return next();
      } else {
        return res.sendStatus(401);
      }
    }
  };

  extractUserFromRequest = <P extends IParams>(req: ICustomRequest<P>): Promise<User | null> => {
    const fn = `FB Middleware (${req.id || ''})`;
    const jwtToken = req.header('Authorization') && ('' + req.header('Authorization')).replace('Bearer ', '');
    if (jwtToken) {
      try {
        return this.decodeAndVerifyJwtToken(jwtToken)
          .then(async (decodedToken: FirebaseAdmin.auth.DecodedIdToken) => {
            if (!decodedToken || !decodedToken.email) {
              utils.consoleError(
                `${fn} - Error: User or email not available! User: ` + JSON.stringify(decodedToken, null, 2)
              );
              return null;
            }

            if (!decodedToken.email_verified) {
              utils.consoleError(`${fn} - Error: Email address wasn't verified yet!`);
              return null;
            }

            return new User(
              this,
              decodedToken.uid,
              decodedToken.email,
              decodedToken.email_verified,
              decodedToken.orgRoles || [],
              // decodedToken[USER_STATE_KEY],
              !!decodedToken.superAdmin
            );
          })
          .catch((error) => {
            utils.consoleError(`${fn} - Error: ` + utils.convertToString(error));
            return null;
          });
      } catch (error) {
        utils.consoleError(`${fn} (try-catch) - Error: ` + utils.convertToString(error));
        return Promise.resolve(null);
      }
    } else {
      const strErr = `${fn} - Error: Firebase token is missing!\nRequest: ` + utils.convertRequestToString(req);
      if (req.headers['cf-worker'] == 'onrender.com' || req.headers['host']?.startsWith('localhost')) {
        utils.consoleLog(strErr + ` [Not reported as error because it's not an error, it's part of the build process]`);
      } else {
        // utils.consoleError(strErr); // TODO: Restore this line instead of the following one:
        utils.consoleError(
          strErr +
            ` req.headers['cf-worker']=${req.headers['cf-worker']}, typeof=${typeof req.headers['cf-worker']}` +
            ` req.headers['host']=${req.headers['host']}, typeof=${typeof req.headers['host']}`
        );
      }
      return Promise.resolve(null);
    }
  };

  private login = async (email: string, password: string): Promise<string> => {
    if (!process.env.FIREBASE_WEB_API) {
      throw new Error(`Firebase.login - process.env.FIREBASE_WEB_API is false! ${process.env.FIREBASE_WEB_API}`);
    }

    utils.consoleLog('Firebase.login - Logging in...');
    return await superagent
      .post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_WEB_API}`)
      .set({
        'content-type': 'application/json',
      })
      .send({
        email: email,
        password: password,
        returnSecureToken: true,
      })
      .then((response) => {
        const idToken = response.body.idToken;

        utils.consoleLog(`Firebase.login - Successfully Logged in! '${idToken.substring(0, 5)}*****'`);
        return idToken;
      });
  };

  getTestUserIDToken = async (): Promise<string> => {
    if (
      process.env.IS_TEST &&
      process.env.FIREBASE_WEB_API &&
      process.env.TEST_FIREBASE_ACCOUNT_EMAIL &&
      process.env.TEST_FIREBASE_ACCOUNT_PASSWORD
    ) {
      return await this.login(process.env.TEST_FIREBASE_ACCOUNT_EMAIL, process.env.TEST_FIREBASE_ACCOUNT_PASSWORD);
    } else {
      throw new Error(
        `FirebaseHandler.getTestUserIDToken - ERROR: Not all preConditions are met! ${utils.convertToString({
          IS_TEST: process.env.IS_TEST || '',
          FIREBASE_WEB_API: process.env.FIREBASE_WEB_API || '',
          TEST_FIREBASE_ACCOUNT_EMAIL: process.env.TEST_FIREBASE_ACCOUNT_EMAIL || '',
          TEST_FIREBASE_ACCOUNT_PASSWORD:
            (process.env.TEST_FIREBASE_ACCOUNT_PASSWORD &&
              process.env.TEST_FIREBASE_ACCOUNT_PASSWORD.substring(0, 4)) ||
            '',
        })}`
      );
    }
  };

  getTestUserAuthHeader = async (): Promise<{ Authorization: string }> => {
    const firebaseAuthIdToken = await this.getTestUserIDToken();
    const headerObj = {
      Authorization: `Bearer ${firebaseAuthIdToken}`,
    };
    return headerObj;
  };

  getClaims = async (uid: string) => {
    const user = await FirebaseAdmin.auth().getUser(uid);
    const currentClaims = user.customClaims;
    return currentClaims;
  };

  updateClaims = async (uid: string, claims: ClaimsArray) => {
    const user = await FirebaseAdmin.auth().getUser(uid);
    const currentClaims = user.customClaims;
    const updatedClaims = {
      ...currentClaims,
    };

    claims.forEach((claimItem) => {
      updatedClaims[claimItem.key] = claimItem.value;
    });

    await FirebaseAdmin.auth().setCustomUserClaims(uid, updatedClaims);
  };

  createUser = async (email: string, additionalFields: Record<string, string>) => {
    let user!: FirebaseAdmin.auth.UserRecord;
    const claims: ClaimsArray = [];
    // Considering non verified user as new user, so suppressing error if the user is not verified
    try {
      user = await this.firebaseInstance.auth().createUser({ email });
      // claims.push({ key: USER_STATE_KEY, value: USER_STATES.PENDING_ORG });
    } catch (error) {
      if (treatAsError(error).code === 'auth/email-already-exists') {
        user = await this.firebaseInstance.auth().getUserByEmail(email);
        if (user.emailVerified) {
          throw error;
        }
      } else {
        utils.consoleError(`Error - create user failed, reason: ${utils.convertToString(error)}`);
        throw error;
      }
    }
    if (additionalFields) {
      Object.keys(additionalFields).map((additionalFieldKey) => {
        claims.push({ key: additionalFieldKey, value: additionalFields[additionalFieldKey] });
      });
    }
    await this.updateClaims(user.uid, claims);
    return user;
  };

  sendResetPasswordEmail = async (email: string) => {
    const firebaseAPIs = new FirebaseAPIs(this.firebaseInstance, {
      werePermissionsTakenCareOf: true,
      webAPI: process.env.FIREBASE_WEB_API || '', // This allows making some more actions like Reset password, etc.
    });
    return await firebaseAPIs.resetPassword(email);
  };

  deleteUser = async (uid: string) => {
    if (process.env.IS_TEST) {
      await FirebaseAdmin.auth().deleteUser(uid);
    } else {
      await this.updateClaims(uid, [{ key: 'IS_DELETED', value: '1' }]);
    }
  };

  superAdminOnlyPermission = (req: ICustomRequest<IParams>, res: ICustomResponse, next: ICustomNextFunction) => {
    if (req.user && utils.isReallyTrue(req.user.superAdmin)) {
      res.removeHeader('Content-Security-Policy');
      return next();
    } else {
      utils.consoleError(`Error (${req.id}) - the user doesn't have super admin role`);
      return res.sendStatus(403);
    }
  };

  /** Need to improve this method to get all users, currently it will only return first 1000 users */
  listUsers = async (): Promise<FirebaseAdmin.auth.UserRecord[]> => {
    const listUsersResponse = await this.firebaseInstance.auth().listUsers();
    return listUsersResponse.users;
  };

  getUser = async (userId: string): Promise<FirebaseAdmin.auth.UserRecord> => {
    const firebaseUser = await this.firebaseInstance.auth().getUser(userId);
    return firebaseUser;
  };

  getUserByEmail = async (email: string): Promise<FirebaseAdmin.auth.UserRecord> => {
    const firebaseUser = await this.firebaseInstance.auth().getUserByEmail(email);
    return firebaseUser;
  };
}
