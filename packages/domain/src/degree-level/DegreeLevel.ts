export enum DegreeLevelStatus {
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
  SUPERSEDED = 'SUPERSEDED',
  MERGED = 'MERGED',
}

export const CANONICAL_DEGREE_LEVEL_CODES = [
  'ASSOCIATE',
  'DIPLOMA',
  'BACHELOR',
  'MASTER',
  'FELLOWSHIP',
  'DOCTORATE',
  'CERTIFICATE'
] as const;

export type CanonicalDegreeLevelCode = typeof CANONICAL_DEGREE_LEVEL_CODES[number];

export interface DegreeLevelReference {
  degreeLevelId: string;
  canonicalCode: CanonicalDegreeLevelCode;
}

export interface DegreeLevelDto {
  id: string;
  canonicalCode: CanonicalDegreeLevelCode;
  nameEn: string;
  nameAr: string;
  displayRank: number;
  status: DegreeLevelStatus;
  aliases?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertDegreeLevelDto {
  canonicalCode: CanonicalDegreeLevelCode;
  nameEn: string;
  nameAr: string;
  displayRank?: number;
  status?: DegreeLevelStatus;
  aliases?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
}
