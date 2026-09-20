import { createHash } from 'node:crypto';
import type { ScholarshipImportReviewAction } from './ScholarshipImportCenterContracts';

const REVIEW_MARKER = '[[SCHOLARSHIP_IMPORT_REVIEW_DECISION_V1]]';
const TRANSFER_MARKER = '[[SCHOLARSHIP_IMPORT_TRANSFER_V1]]';

export interface ScholarshipImportReviewDecisionEnvelope {
  version: 1;
  decisionId: string;
  recordId: string;
  action: ScholarshipImportReviewAction;
  actorId: string;
  reason?: string;
  correlationId?: string;
  recordedAt: string;
  duplicateKey: string | null;
  targetScholarshipId: string | null;
  reviewFingerprint: string;
}

export interface ScholarshipImportTransferReceipt {
  version: 1;
  recordId: string;
  scholarshipId: string;
  actorId: string;
  correlationId?: string;
  transferredAt: string;
  mode: 'CREATE' | 'MERGE';
  verificationDecisionId?: string;
  canonicalDecisionIds?: string[];
  decisionSnapshotFingerprint?: string;
}

export function scholarshipImportReviewFingerprint(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function appendScholarshipImportReviewDecision(
  processingNotes: string | null | undefined,
  decision: ScholarshipImportReviewDecisionEnvelope,
): string {
  return appendEnvelope(processingNotes, REVIEW_MARKER, decision);
}

export function readScholarshipImportReviewDecision(
  processingNotes: string | null | undefined,
): ScholarshipImportReviewDecisionEnvelope | null {
  if (!processingNotes) return null;
  const lines = processingNotes.split(/\r?\n/u);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (!line.startsWith(REVIEW_MARKER)) continue;
    try {
      const parsed = JSON.parse(line.slice(REVIEW_MARKER.length)) as Partial<ScholarshipImportReviewDecisionEnvelope>;
      if (
        parsed.version === 1 &&
        typeof parsed.decisionId === 'string' &&
        typeof parsed.recordId === 'string' &&
        (parsed.action === 'MERGE' || parsed.action === 'KEEP_CURRENT' || parsed.action === 'SPLIT') &&
        typeof parsed.actorId === 'string' &&
        typeof parsed.recordedAt === 'string' &&
        typeof parsed.reviewFingerprint === 'string'
      ) {
        return parsed as ScholarshipImportReviewDecisionEnvelope;
      }
    } catch {
      return null;
    }
  }
  return null;
}

export function appendScholarshipImportTransferReceipt(
  processingNotes: string | null | undefined,
  receipt: ScholarshipImportTransferReceipt,
): string {
  return appendEnvelope(processingNotes, TRANSFER_MARKER, receipt);
}

export function readScholarshipImportTransferReceipt(
  processingNotes: string | null | undefined,
): ScholarshipImportTransferReceipt | null {
  if (!processingNotes) return null;
  const lines = processingNotes.split(/\r?\n/u);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (!line.startsWith(TRANSFER_MARKER)) continue;
    try {
      const parsed = JSON.parse(line.slice(TRANSFER_MARKER.length)) as Partial<ScholarshipImportTransferReceipt>;
      if (
        parsed.version === 1 &&
        nonEmpty(parsed.recordId) &&
        nonEmpty(parsed.scholarshipId) &&
        nonEmpty(parsed.actorId) &&
        nonEmpty(parsed.transferredAt) &&
        !Number.isNaN(Date.parse(parsed.transferredAt)) &&
        (parsed.mode === 'CREATE' || parsed.mode === 'MERGE') &&
        (parsed.correlationId === undefined || nonEmpty(parsed.correlationId)) &&
        (parsed.verificationDecisionId === undefined || nonEmpty(parsed.verificationDecisionId)) &&
        (parsed.canonicalDecisionIds === undefined || (Array.isArray(parsed.canonicalDecisionIds) && parsed.canonicalDecisionIds.every(nonEmpty))) &&
        (parsed.decisionSnapshotFingerprint === undefined || nonEmpty(parsed.decisionSnapshotFingerprint))
      ) return parsed as ScholarshipImportTransferReceipt;
    } catch {
      return null;
    }
  }
  return null;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function appendEnvelope(
  processingNotes: string | null | undefined,
  marker: string,
  envelope: object,
): string {
  const existing = processingNotes?.trimEnd();
  const serialized = `${marker}${JSON.stringify(envelope)}`;
  return existing ? `${existing}\n${serialized}` : serialized;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}
