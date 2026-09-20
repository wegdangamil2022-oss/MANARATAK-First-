import { AggregateRoot, Identifier, generateOpaqueIdentifier } from '@manaratak/core';
import { IdentityType } from '../enums/IdentityType';
import { LifeStatus } from '../enums/LifeStatus';
import { User } from '../entities/User';
import { Account } from '../entities/Account';
import { TechnicalMetadata } from '../value-objects/TechnicalMetadata';
import { IdentityCreatedEvent } from '../events/IdentityCreatedEvent';
import { IdentityActivatedEvent } from '../events/IdentityActivatedEvent';
import { IdentityStatusChangedEvent } from '../events/IdentityStatusChangedEvent';
import { IdentityContactUpdatedEvent } from '../events/IdentityContactUpdatedEvent';
import { Profile } from '../value-objects/Profile';

export interface IdentityProps {
  type: IdentityType;
  status: LifeStatus;
  user: User | null;
  account: Account;
  technicalMetadata: TechnicalMetadata;
}

export class Identity extends AggregateRoot<IdentityProps> {
  constructor(props: IdentityProps, id?: Identifier<string | number>) {
    super(props, id);
    this.validate();
  }

  get type(): IdentityType {
    return this.props.type;
  }

  get status(): LifeStatus {
    return this.props.status;
  }

  get user(): User | null {
    return this.props.user;
  }

  get account(): Account {
    return this.props.account;
  }

  get technicalMetadata(): TechnicalMetadata {
    return this.props.technicalMetadata;
  }

  public static create(
    type: IdentityType,
    user: User | null,
    accountProps: { storageQuotaBytes: number; rateLimitMax: number; rateLimitWindowMs: number },
    technicalMetadata: TechnicalMetadata,
    id?: Identifier<string | number>
  ): Identity {
    const identityId = id ? id.toString() : generateOpaqueIdentifier();
    const identifier = new Identifier<string | number>(identityId);

    const account = new Account({
      identityId,
      accessState: 'Active',
      storageQuotaBytes: accountProps.storageQuotaBytes,
      rateLimitMax: accountProps.rateLimitMax,
      rateLimitWindowMs: accountProps.rateLimitWindowMs
    });

    const identity = new Identity({
      type,
      status: LifeStatus.PROVISIONED,
      user,
      account,
      technicalMetadata
    }, identifier);

    identity.addDomainEvent(new IdentityCreatedEvent(identityId, type));

    return identity;
  }

  public activate(): void {
    if (this.props.status === LifeStatus.ACTIVE) {
      return;
    }
    
    if (this.props.type === IdentityType.Human) {
      if (!this.props.user) {
        throw new Error('User is required for human identity type.');
      }
      if (!this.props.user.contactRegistry.isEmailVerified && !this.props.user.contactRegistry.isPhoneVerified) {
        throw new Error('Cannot activate user without verifying at least one primary contact channel.');
      }
    }

    const oldStatus = this.props.status;
    this.props.status = LifeStatus.ACTIVE;
    this.props.account.activate();

    this.addDomainEvent(new IdentityStatusChangedEvent(this.id.toString(), oldStatus, LifeStatus.ACTIVE, 'Manual activation'));

    const primaryEmail = this.props.user ? this.props.user.contactRegistry.primaryEmail : 'system';
    this.addDomainEvent(new IdentityActivatedEvent(this.id.toString(), primaryEmail));
  }

  public suspend(reason?: string): void {
    if (this.props.status === LifeStatus.SUSPENDED) {
      return;
    }
    const oldStatus = this.props.status;
    this.props.status = LifeStatus.SUSPENDED;
    this.props.account.suspend();

    this.addDomainEvent(new IdentityStatusChangedEvent(this.id.toString(), oldStatus, LifeStatus.SUSPENDED, reason));
  }

  public archive(reason?: string): void {
    if (this.props.status === LifeStatus.ARCHIVED) {
      return;
    }
    const oldStatus = this.props.status;
    this.props.status = LifeStatus.ARCHIVED;
    this.addDomainEvent(new IdentityStatusChangedEvent(this.id.toString(), oldStatus, LifeStatus.ARCHIVED, reason));
  }

  public purge(reason?: string): void {
    if (this.props.status === LifeStatus.PURGED) {
      return;
    }
    const oldStatus = this.props.status;
    this.props.status = LifeStatus.PURGED;
    this.props.account.suspend();
    
    if (this.props.user) {
      const anonymizedProfile = new Profile({
        displayName: 'ANONYMOUS',
        avatarUrl: '',
        preferredLanguage: 'en',
        timeZone: 'UTC'
      });
      this.props.user.updateProfile(anonymizedProfile);
      this.props.user.contactRegistry.updateEmail('deleted@manaratak.local');
      this.props.user.contactRegistry.updatePhone(undefined);
    }

    this.addDomainEvent(new IdentityStatusChangedEvent(this.id.toString(), oldStatus, LifeStatus.PURGED, reason));
  }

  public updateEmail(newEmail: string): void {
    if (this.props.type !== IdentityType.Human || !this.props.user) {
      throw new Error('Can only update email for human users.');
    }
    const oldEmail = this.props.user.contactRegistry.primaryEmail;
    if (oldEmail === newEmail) {
      return;
    }
    this.props.user.contactRegistry.updateEmail(newEmail);
    this.addDomainEvent(new IdentityContactUpdatedEvent(this.id.toString(), 'Email', oldEmail, newEmail));
  }

  public updatePhone(newPhone?: string): void {
    if (this.props.type !== IdentityType.Human || !this.props.user) {
      throw new Error('Can only update phone for human users.');
    }
    const oldPhone = this.props.user.contactRegistry.primaryPhone || '';
    if (oldPhone === (newPhone || '')) {
      return;
    }
    this.props.user.contactRegistry.updatePhone(newPhone);
    this.addDomainEvent(new IdentityContactUpdatedEvent(this.id.toString(), 'Phone', oldPhone, newPhone || ''));
  }

  public updateProfile(newProfile: Profile): void {
    if (this.props.type !== IdentityType.Human || !this.props.user) {
      throw new Error('Can only update profile for human users.');
    }
    this.props.user.updateProfile(newProfile);
  }

  public updateTechnicalMetadata(newMetadata: TechnicalMetadata): void {
    this.props.technicalMetadata = newMetadata;
  }

  private validate(): void {
    if (!this.props.type) {
      throw new Error('IdentityType is required.');
    }
    if (!this.props.status) {
      throw new Error('LifeStatus is required.');
    }
    if (this.props.type === IdentityType.Human && !this.props.user) {
      throw new Error('A Human identity type must include a non-null User entity.');
    }
    if (this.props.type !== IdentityType.Human && this.props.user) {
      throw new Error('A non-Human identity type must have a null User entity.');
    }
    if (!this.props.account) {
      throw new Error('Identity must be linked to an operational Account.');
    }
    if (!this.props.technicalMetadata) {
      throw new Error('Identity must have a TechnicalMetadata object.');
    }
  }
}
