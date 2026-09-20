export interface AllocateCacheDto {
  scope: string;
  key: string;
  payload: any;
  ttlSeconds: number;
  absoluteExpirationTime?: string;
  invalidationTokens?: string[];
  ownerReference?: string;
  policyTags?: string[];
}

export interface GetCacheDto {
  scope: string;
  key: string;
}

export interface InvalidateCacheDto {
  scope: string;
  key: string;
}
