import { Entity, Identifier } from '@manaratak/core';

export enum AccountAccessState {
  ACTIVE = 'Active',
  SUSPENDED = 'Suspended',
  LOCKED = 'Locked',
  RATE_LIMITED = 'RateLimited'
}

export interface AccountProps {
  identityId: string;
  accessState: AccountAccessState | string; // e.g. "Active", "Suspended", "Locked", "RateLimited"
  storageQuotaBytes: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
  configurationFlags?: Record<string, boolean>;
}

export class Account extends Entity<AccountProps> {
  constructor(props: AccountProps, id?: Identifier<string | number>) {
    super(props, id);
    this.validate();
  }

  get identityId(): string {
    return this.props.identityId;
  }

  get accessState(): AccountAccessState | string {
    return this.props.accessState;
  }

  get storageQuotaBytes(): number {
    return this.props.storageQuotaBytes;
  }

  get rateLimitMax(): number {
    return this.props.rateLimitMax;
  }

  get rateLimitWindowMs(): number {
    return this.props.rateLimitWindowMs;
  }

  get configurationFlags(): Record<string, boolean> {
    return this.props.configurationFlags || {};
  }

  public suspend(): void {
    this.props.accessState = AccountAccessState.SUSPENDED;
  }

  public activate(): void {
    this.props.accessState = AccountAccessState.ACTIVE;
  }

  public lock(): void {
    this.props.accessState = AccountAccessState.LOCKED;
  }

  public updateQuotas(storageBytes: number, rateMax: number, rateWindowMs: number): void {
    this.props.storageQuotaBytes = storageBytes;
    this.props.rateLimitMax = rateMax;
    this.props.rateLimitWindowMs = rateWindowMs;
    this.validate();
  }

  private validate(): void {
    if (!this.props.identityId) {
      throw new Error('Identity ID is required for an Account.');
    }
    if (this.props.storageQuotaBytes < 0) {
      throw new Error('Storage quota bytes cannot be negative.');
    }
    if (this.props.rateLimitMax < 0) {
      throw new Error('Rate limit max cannot be negative.');
    }
  }
}
