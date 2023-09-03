import superagent from 'superagent';
import FirebaseAdmin from 'firebase-admin';

import { ICustomRequest, ICustomResponse, ICustomNextFunction, IResponseBasic, IParams } from '../types/expressCustom';
import { User } from '../entities/User.model';
import IFirebaseHandler, { ClaimsArray } from './IFirebaseHandler';

export class FirebaseHandler_Mock implements IFirebaseHandler {
  mockedUser: User | null = null;
  mockedClaims: Record<string, unknown> = {};

  // Functions that appear only in mock
  // ----------------------------------
  setTestUserToBeReturned(user: User | null) {
    this.mockedUser = user;
  }

  setMockedClaims(claims: Record<string, unknown>) {
    this.mockedClaims = claims;
  }
  // ----------------------------------

  getInstance(): FirebaseAdmin.app.App {
    return (1 as unknown) as FirebaseAdmin.app.App;
  }

  whitelistRequest<P extends IParams>(req: ICustomRequest<P>, res: ICustomResponse, next: ICustomNextFunction) {
    res.whitelisted = true;
    return next();
  }

  decodeAndVerifyJwtToken(idToken: string): Promise<FirebaseAdmin.auth.DecodedIdToken> {
    throw new Error('Not implemented!');
  }

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

  extractUserFromRequest<P extends IParams>(req: ICustomRequest<P>): Promise<User | null> {
    return Promise.resolve(this.mockedUser);
  }

  async login(email: string, password: string): Promise<string> {
    throw new Error('Not implemented!');
  }

  async getTestUserIDToken(): Promise<string> {
    throw new Error('Not implemented!');
  }

  async getTestUserAuthHeader(): Promise<{ Authorization: string }> {
    throw new Error('Not implemented!');
  }

  async getClaims(uid: string) {
    return this.mockedClaims;
  }

  async updateClaims(uid: string, claims: ClaimsArray) {
    claims.forEach((claimItem) => {
      this.mockedClaims[claimItem.key] = claimItem.value;
    });
  }

  createUser(email: string, additionalFields: Record<string, string>): Promise<FirebaseAdmin.auth.UserRecord> {
    const userRecord: FirebaseAdmin.auth.UserRecord = {
      email: email,
      emailVerified: true,
      disabled: false,
      metadata: (null as unknown) as FirebaseAdmin.auth.UserMetadata,
      providerData: [],
      customClaims: {},
      toJSON: () => {
        throw new Error('Function not implemented.');
      },

      // TODO: add a function, that will be available only in the mock, that will set the uid of new users.
      uid: 'newUserUid1',
    };
    userRecord.toJSON = () => userRecord;
    return Promise.resolve(userRecord);
  }

  async deleteUser(uid: string): Promise<void> {
    throw new Error('Not implemented!');
  }

  superAdminOnlyPermission = (req: ICustomRequest<IParams>, res: ICustomResponse, next: ICustomNextFunction) => {
    if (req.user && req.user.superAdmin) {
      res.removeHeader('Content-Security-Policy');
      return next();
    } else {
      return res.sendStatus(403);
    }
  };

  listUsers(): Promise<FirebaseAdmin.auth.UserRecord[]> {
    const userRecord: FirebaseAdmin.auth.UserRecord = {
      email: 'anon@mailinator.com',
      emailVerified: true,
      disabled: false,
      metadata: (null as unknown) as FirebaseAdmin.auth.UserMetadata,
      providerData: [],
      customClaims: {},
      toJSON: () => {
        throw new Error('Function not implemented.');
      },

      // TODO: add a function, that will be available only in the mock, that will set the uid of new users.
      uid: 'newUserUid1',
    };
    return Promise.resolve([userRecord]);
  }

  getUser(uid: string): Promise<FirebaseAdmin.auth.UserRecord> {
    const userRecord: FirebaseAdmin.auth.UserRecord = {
      email: 'anon@mailinator.com',
      emailVerified: true,
      disabled: false,
      metadata: (null as unknown) as FirebaseAdmin.auth.UserMetadata,
      providerData: [],
      customClaims: {},
      toJSON: () => {
        throw new Error('Function not implemented.');
      },

      // TODO: add a function, that will be available only in the mock, that will set the uid of new users.
      uid: 'newUserUid1',
    };
    return Promise.resolve(userRecord);
  }

  getUserByEmail(email: string): Promise<FirebaseAdmin.auth.UserRecord> {
    const userRecord: FirebaseAdmin.auth.UserRecord = {
      email: 'anon@mailinator.com',
      emailVerified: true,
      disabled: false,
      metadata: (null as unknown) as FirebaseAdmin.auth.UserMetadata,
      providerData: [],
      customClaims: {},
      toJSON: () => {
        throw new Error('Function not implemented.');
      },

      // TODO: add a function, that will be available only in the mock, that will set the uid of new users.
      uid: 'newUserUid1',
    };
    return Promise.resolve(userRecord);
  }

  sendResetPasswordEmail(email: string): Promise<boolean> {
    return Promise.resolve(true);
  }
}
