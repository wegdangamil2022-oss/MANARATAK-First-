export enum RetentionOwner {
  IMPORT = 'IMPORT',
  AUDIT = 'AUDIT',
  ASSET = 'ASSET',
}

export enum RetentionDisposition {
  PURGE = 'PURGE',
  ARCHIVE = 'ARCHIVE',
  KEEP = 'KEEP',
}

export interface RetentionCandidate {
  owner: RetentionOwner;
  recordId: string;
  expiresAt: Date;
  legalHoldUntil?: Date | null;
  retentionCategory?: string | null;
  lifecycleState?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface RetentionDecision {
  decisionKey: string;
  owner: RetentionOwner;
  recordId: string;
  expiresAt: Date;
  disposition: RetentionDisposition;
  reason: string;
  decidedAt: Date;
}

export function decideRetention(candidate: RetentionCandidate, now: Date): RetentionDecision {
  if (!(candidate.expiresAt instanceof Date) || Number.isNaN(candidate.expiresAt.getTime())) throw new Error('RETENTION_EXPIRY_INVALID');
  const decisionKey = `${candidate.owner}:${candidate.recordId}:${candidate.expiresAt.toISOString()}`;
  if (candidate.expiresAt.getTime() > now.getTime()) {
    return { decisionKey, owner: candidate.owner, recordId: candidate.recordId, expiresAt: candidate.expiresAt, disposition: RetentionDisposition.KEEP, reason: 'NOT_EXPIRED', decidedAt: now };
  }
  if (candidate.legalHoldUntil && candidate.legalHoldUntil.getTime() > now.getTime()) {
    return { decisionKey, owner: candidate.owner, recordId: candidate.recordId, expiresAt: candidate.expiresAt, disposition: RetentionDisposition.KEEP, reason: 'LEGAL_HOLD_ACTIVE', decidedAt: now };
  }
  if (candidate.owner === RetentionOwner.AUDIT) {
    return { decisionKey, owner: candidate.owner, recordId: candidate.recordId, expiresAt: candidate.expiresAt, disposition: RetentionDisposition.ARCHIVE, reason: 'AUDIT_EVIDENCE_ARCHIVE', decidedAt: now };
  }
  if (candidate.owner === RetentionOwner.IMPORT) {
    return { decisionKey, owner: candidate.owner, recordId: candidate.recordId, expiresAt: candidate.expiresAt, disposition: RetentionDisposition.PURGE, reason: 'IMPORT_RAW_PAYLOAD_EXPIRED', decidedAt: now };
  }
  const category = String(candidate.retentionCategory ?? '').toUpperCase();
  if (candidate.owner === RetentionOwner.ASSET && category === 'PERMANENT') {
    return { decisionKey, owner: candidate.owner, recordId: candidate.recordId, expiresAt: candidate.expiresAt, disposition: RetentionDisposition.KEEP, reason: 'ASSET_PERMANENT_POLICY', decidedAt: now };
  }
  return { decisionKey, owner: candidate.owner, recordId: candidate.recordId, expiresAt: candidate.expiresAt, disposition: RetentionDisposition.PURGE, reason: 'ASSET_RETENTION_EXPIRED', decidedAt: now };
}
