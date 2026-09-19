import { ApiClient } from '../../api/client';
import { resolveAuthenticatedDestination, type AuthDestination, type TrustedSessionIdentity } from './authRouting';

export interface TrustedAuthClient {
  login(email: string, password: string): Promise<unknown>;
  getCurrentSessionIdentity(): Promise<TrustedSessionIdentity>;
}

/**
 * Authenticates once through the unified server endpoint, then resolves the destination
 * only from the trusted /auth/me identity. No email/client-storage role inference lives here.
 */
export async function authenticateAccount(
  email: string,
  password: string,
  adminBaseUrl?: string,
  client: TrustedAuthClient = ApiClient,
): Promise<AuthDestination> {
  await client.login(email, password);
  const identity = await client.getCurrentSessionIdentity();
  return resolveAuthenticatedDestination(identity, adminBaseUrl);
}
