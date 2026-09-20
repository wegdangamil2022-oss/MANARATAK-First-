import { AuthTokens } from './ITokenProvider';

export interface IAuthService {
  login(userId: string): Promise<AuthTokens>;
  logout(userId: string, refreshToken: string): Promise<void>;
  logoutCurrentSession(refreshToken: string): Promise<void>;
  refreshTokens(refreshToken: string): Promise<AuthTokens>;
}
