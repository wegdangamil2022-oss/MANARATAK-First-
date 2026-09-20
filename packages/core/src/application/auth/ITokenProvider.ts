export interface TokenPayload {
  userId: string;
  /** Server-side session identifier embedded in the short-lived access token. */
  sessionId?: string;
  [key: string]: any;
}

export interface AuthTokens {
  accessToken: string;
  /** Cryptographically random opaque credential; never a JWT. */
  refreshToken: string;
}

export interface ITokenProvider {
  generateTokens(payload: TokenPayload): Promise<AuthTokens>;
  generateAccessToken(payload: TokenPayload): Promise<string>;
  generateRefreshToken(): Promise<string>;
  verifyAccessToken(token: string): Promise<TokenPayload>;
  validateRefreshToken(token: string): Promise<void>;
  getJwks?(): { readonly keys: readonly Record<string, unknown>[] };
}
