export interface CreateTemplateDto {
  id: string;
  channels: string[];
  requiredVariables: string[];
  localizations: string[];
  contents?: Record<string, { subject: string; body: string }>;
}

export interface CreateIntentDto {
  purpose?: 'TRANSACTIONAL' | 'PROMOTIONAL';
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
