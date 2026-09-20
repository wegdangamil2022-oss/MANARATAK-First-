import { Entity, Identifier } from '@manaratak/core';

export interface ContactRegistryProps {
  primaryEmail: string;
  isEmailVerified: boolean;
  primaryPhone?: string;
  isPhoneVerified: boolean;
  alternativeContacts?: Array<{ type: string; value: string; isVerified: boolean }>;
}

export class ContactRegistry extends Entity<ContactRegistryProps> {
  constructor(props: ContactRegistryProps, id?: Identifier<string | number>) {
    super(props, id);
    this.validate();
  }

  get primaryEmail(): string {
    return this.props.primaryEmail;
  }

  get isEmailVerified(): boolean {
    return this.props.isEmailVerified;
  }

  get primaryPhone(): string | undefined {
    return this.props.primaryPhone;
  }

  get isPhoneVerified(): boolean {
    return this.props.isPhoneVerified;
  }

  get alternativeContacts(): Array<{ type: string; value: string; isVerified: boolean }> {
    return this.props.alternativeContacts || [];
  }

  public verifyEmail(): void {
    this.props.isEmailVerified = true;
  }

  public verifyPhone(): void {
    this.props.isPhoneVerified = true;
  }

  public updateEmail(newEmail: string): void {
    this.props.primaryEmail = newEmail;
    this.props.isEmailVerified = false;
    this.validate();
  }

  public updatePhone(newPhone?: string): void {
    this.props.primaryPhone = newPhone;
    this.props.isPhoneVerified = false;
    this.validate();
  }

  private validate(): void {
    if (!this.props.primaryEmail || !this.props.primaryEmail.includes('@')) {
      throw new Error('A valid primary email is required.');
    }
  }
}
