import { IEmailDeliveryGateway, SendVerificationEmailInput, SendPasswordResetEmailInput } from '@manaratak/domain';

export class CapturedEmailDeliveryGateway implements IEmailDeliveryGateway {
  private dispatchedEmails: SendVerificationEmailInput[] = [];
  private dispatchedResetEmails: SendPasswordResetEmailInput[] = [];

  public async sendVerificationEmail(input: SendVerificationEmailInput): Promise<void> {
    this.dispatchedEmails.push({ ...input });
  }

  public getDispatchedEmails(): SendVerificationEmailInput[] {
    return [...this.dispatchedEmails];
  }

  public getLastDispatchedEmail(): SendVerificationEmailInput | undefined {
    return this.dispatchedEmails[this.dispatchedEmails.length - 1];
  }

  public async sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<void> {
    this.dispatchedResetEmails.push({ ...input });
  }

  public getDispatchedResetEmails(): SendPasswordResetEmailInput[] {
    return [...this.dispatchedResetEmails];
  }

  public getLastDispatchedResetEmail(): SendPasswordResetEmailInput | undefined {
    return this.dispatchedResetEmails[this.dispatchedResetEmails.length - 1];
  }

  public clear(): void {
    this.dispatchedEmails = [];
    this.dispatchedResetEmails = [];
  }
}
