import { canonicalizeUnicodeIdentity } from './UnicodeCanonicalization';

export const SERVICE_IDENTITY_IGNORED_TOKENS = ['best', 'offer', 'urgent', 'new', 'limited', 'deal'] as const;
export const CAREER_IDENTITY_IGNORED_TOKENS = ['urgent', 'hiring', 'best', 'opportunity', '2024', '2025', '2026', '2027'] as const;

export function canonicalizeServiceIdentityName(value: string): string {
  return canonicalizeUnicodeIdentity(value, { ignoredTokens: SERVICE_IDENTITY_IGNORED_TOKENS });
}

export function canonicalizeCareerIdentityText(value: string): string {
  return canonicalizeUnicodeIdentity(value, { ignoredTokens: CAREER_IDENTITY_IGNORED_TOKENS });
}
