import { IdentityType } from '@manaratak/domain';
import { LifeStatus } from '@manaratak/domain';

export interface IdentityDto {
  id: string;
  type: IdentityType;
  status: LifeStatus;
  user?: {
    profile: {
      displayName: string;
      avatarUrl: string;
      preferredLanguage: string;
      timeZone: string;
    };
    contactRegistry: {
      primaryEmail: string;
      isEmailVerified: boolean;
      primaryPhone?: string;
      isPhoneVerified: boolean;
      alternativeContacts: Array<{ type: string; value: string; isVerified: boolean }>;
    };
  };
  account: {
    accessState: string;
    storageQuotaBytes: number;
    rateLimitMax: number;
    rateLimitWindowMs: number;
    configurationFlags: Record<string, boolean>;
  };
  technicalMetadata: Record<string, string | number | boolean | null>;
}

export interface ProvisionIdentityInput {
  type: IdentityType;
  displayName?: string;
  avatarUrl?: string;
  preferredLanguage?: string;
  timeZone?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  /** Server-owned audit principal; never accepted from client JSON. */
  createdBy: string;
}

export interface UpdateProfileInput {
  identityId: string;
  displayName: string;
  avatarUrl: string;
  preferredLanguage: string;
  timeZone: string;
}

export interface UpdateContactInput {
  identityId: string;
  email?: string;
  phone?: string;
  verifyEmail?: boolean;
  verifyPhone?: boolean;
}
