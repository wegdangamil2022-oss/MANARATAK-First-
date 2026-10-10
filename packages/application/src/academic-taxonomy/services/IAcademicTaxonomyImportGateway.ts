import type { AtomicPersistenceContext } from '@manaratak/domain';
import type { AcademicImportRecord } from './AcademicTaxonomyScreeningConsumer';
export interface AcademicImportReview {
  id: string; receiptId: string; sourceHash: string; record: AcademicImportRecord; previewHash: string;
  status: 'PREVIEWED' | 'APPROVED' | 'REJECTED' | 'APPLIED'; version: number;
  preview: { issues: Array<{ code: string; severity: string; message: string }>; nodeVersions: Record<string, string> };
  reviewedBy?: string; reason?: string; result?: unknown;
}
export interface IAcademicTaxonomyImportGateway {
  withTransaction(context: AtomicPersistenceContext): IAcademicTaxonomyImportGateway;
  lock(id: string): Promise<void>;
  screening(receiptId: string): Promise<{ id: string; requestHash: string; result: unknown } | null>;
  get(id: string): Promise<AcademicImportReview | null>;
  create(plan: AcademicImportReview): Promise<void>;
  save(plan: AcademicImportReview, expectedVersion: number): Promise<void>;
  list(page: number, status?: AcademicImportReview['status']): Promise<{ data: AcademicImportReview[]; total: number }>;
  listScreenings(page: number): Promise<{ data: Array<{ id: string; createdAt: Date; result: unknown }>; total: number }>;
}
