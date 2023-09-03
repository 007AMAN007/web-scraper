import FirebaseAdmin from 'firebase-admin';

import { ICustomRequest, ICustomResponse, ICustomNextFunction, IResponseBasic, IParams } from '../types/expressCustom';
import { User } from '../entities/User.model';

export interface IClaimItem {
  key: string;
  value: unknown;
}
export type DecodedIdToken = FirebaseAdmin.auth.DecodedIdToken;
export type ClaimsArray = Array<IClaimItem>;

export default interface FirebaseHandler {
  getInstance(): FirebaseAdmin.app.App;

  whitelistRequest<P extends IParams>(req: ICustomRequest<P>, res: ICustomResponse, next: ICustomNextFunction): void;

  decodeAndVerifyJwtToken(idToken: string): Promise<FirebaseAdmin.auth.DecodedIdToken>;

  middleware<P extends IParams>(
    req: ICustomRequest<P>,
    res: ICustomResponse,
    next: ICustomNextFunction
  ): Promise<void | ICustomResponse>;

  extractUserFromRequest<P extends IParams>(req: ICustomRequest<P>): Promise<User | null>;

  // login(email: string, password: string): Promise<string>;

  getTestUserIDToken(): Promise<string>;

  listUsers(): Promise<FirebaseAdmin.auth.UserRecord[]>;

  getUser(userId: string): Promise<FirebaseAdmin.auth.UserRecord>;

  getUserByEmail(email: string): Promise<FirebaseAdmin.auth.UserRecord>;

  getTestUserAuthHeader(): Promise<{ Authorization: string }>;

  getClaims(uid: string): Promise<Record<string, unknown> | undefined>;

  updateClaims(uid: string, claims: ClaimsArray): Promise<void>;

  createUser(email: string, additionalFields?: Record<string, string>): Promise<FirebaseAdmin.auth.UserRecord>;

  deleteUser(uid: string): Promise<void>;

  sendResetPasswordEmail(email: string): Promise<boolean>;

  superAdminOnlyPermission(req: ICustomRequest<IParams>, res: ICustomResponse, next: ICustomNextFunction): void;
}
