export interface PasswordCredentialSnapshot {
  id: string;
  passwordHash: string;
  disabled: boolean;
}

/** Mutations must persist credential, session revocation and audit atomically. */
export interface IPasswordCredentialRepository {
  find(identityId: string): Promise<PasswordCredentialSnapshot | null>;
  change(identityId: string, expectedHash: string, passwordHash: string): Promise<void>;
  disable(identityId: string, actorId: string, changeId: string): Promise<void>;
}
