import type { IAuthUser } from './auth-user.interface';
import type { ITokenPair } from './token-pair.interface';

export interface ILoginResponse extends ITokenPair {
  user: IAuthUser;
}
