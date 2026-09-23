export interface SendVerificationEmailInput {
  email: string;
  token: string;
  displayName: string;
}

export interface SendPasswordResetEmailInput {
  email: string;
  token: string;
  displayName: string;
}

export interface IEmailDeliveryGateway {
  sendVerificationEmail(input: SendVerificationEmailInput): Promise<void>;
  sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<void>;
}
