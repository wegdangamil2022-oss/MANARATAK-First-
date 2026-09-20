export interface ICredentialVerifier {
  verify(userId: string, credentialValue: string): Promise<boolean>;
  verifyDummy?(credentialValue: string): Promise<void>;
}

export class DenyAllCredentialVerifier implements ICredentialVerifier {
  public async verify(_userId: string, _credentialValue: string): Promise<boolean> {
    // Runtime default is deny-all unless a real/injected verifier is configured
    return false;
  }

  public async verifyDummy(_credentialValue: string): Promise<void> {
    return;
  }
}
