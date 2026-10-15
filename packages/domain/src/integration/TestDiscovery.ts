export type TestDiscoveryOwner = 'STUDENT_TOOLS' | 'SERVICES';
export interface TestDiscoveryLink {
  id: string;
  ownerKey: string;
  testId: string;
  ownerRevision: string;
  testRevision: string;
  status: 'PENDING' | 'APPROVED' | 'REVOKED';
  version: number;
  proposedBy: string;
  reviewedBy: string | null;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface ITestDiscoveryLinkRepository {
  readonly ownerDomain: TestDiscoveryOwner;
  listOwner(
    ownerKey: string,
    after?: string,
  ): Promise<{ data: TestDiscoveryLink[]; hasMore: boolean; nextCursor: string | null }>;
  listApproved(
    testId: string,
    after: string | undefined,
    limit: number,
  ): Promise<{ data: TestDiscoveryLink[]; hasMore: boolean; nextCursor: string | null }>;
  propose(input: {
    ownerKey: string;
    testId: string;
    ownerRevision: string;
    testRevision: string;
    expectedVersion: number;
    reason: string;
    actorId: string;
  }): Promise<TestDiscoveryLink>;
  find(ownerKey: string, testId: string): Promise<TestDiscoveryLink | null>;
  review(input: {
    ownerKey: string;
    testId: string;
    expectedVersion: number;
    status: 'APPROVED' | 'REVOKED';
    actorId: string;
    reason: string;
  }): Promise<TestDiscoveryLink>;
}
export interface TestDiscoveryIdentity {
  ownerKey: string;
  revision: string;
  publicId: string;
  slug: string;
  displayName: string;
  href: string;
  requiresSignIn?: boolean;
  fulfillmentPolicy?: 'FREE' | 'CHARGEABLE' | 'QUOTE_REQUIRED';
  price?: { amountMinorUnits: string; currencyCode: string; scale: number } | null;
}
export interface ITestDiscoveryOwnerGateway {
  resolve(ownerKey: string, locale: 'ar' | 'en'): Promise<TestDiscoveryIdentity | null>;
}
export interface TestDiscoveryPage {
  ownerDomain: TestDiscoveryOwner;
  state: 'AVAILABLE' | 'EMPTY' | 'UNAVAILABLE';
  data: TestDiscoveryIdentity[];
  hasMore: boolean;
  nextCursor: string | null;
  scanned: number;
}
