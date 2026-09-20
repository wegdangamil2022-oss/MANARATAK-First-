export interface CreateTemplateDto {
  id: string;
  channels: string[];
  requiredVariables: string[];
  localizations: string[];
}

export interface CreateIntentDto {
  id: string;
  reference: string;
  templateId: string;
  recipientReference: string;
  variables: Record<string, string>;
  scheduledAt?: Date;
  expiresAt?: Date;
  retryMaxRetries?: number;
  retryBackoffMs?: number;
}
