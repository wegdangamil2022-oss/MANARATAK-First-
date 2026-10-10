import type { ReferenceStandardSnapshot } from '../governance/ReferenceStandardsRegistry';

export interface ReferenceOwnerReview {
  id: string; receiptId: string; sourceHash: string; entityType: 'COUNTRY'|'CURRENCY'|'LANGUAGE'|'CITY';
  payload: Record<string, unknown>; preview: { issues: string[]; currentId: string | null; currentVersion: number | null; dependencyHash: string };
  previewHash: string; version: number; status: 'PREVIEWED'|'APPROVED'|'REJECTED'|'APPLIED'; reviewer?: string | null; reason?: string | null; result?: unknown;
}
export interface ReferenceSnapshotRecord extends ReferenceStandardSnapshot { sourceArtifactId: string; version: number }
