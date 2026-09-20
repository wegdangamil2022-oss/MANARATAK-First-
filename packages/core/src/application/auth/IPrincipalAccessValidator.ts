export interface IPrincipalAccessValidator {
  /**
   * Returns true only when the canonical identity/account is currently
   * permitted to authenticate. Authentication boundaries must fail closed
   * on lookup errors or inactive lifecycle/access state.
   */
  isAuthenticationAllowed(principalId: string): Promise<boolean>;
}
