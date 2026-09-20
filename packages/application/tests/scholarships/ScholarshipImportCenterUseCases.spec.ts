import { describe, expect, it, vi } from 'vitest';
import type { IScholarshipRepository, ScholarshipDto } from '@manaratak/domain';
import {
  ScholarshipImportCenterUseCases,
  appendScholarshipImportReviewDecision,
  appendScholarshipImportTransferReceipt,
  type IScholarshipImportCenterGateway,
  type ScholarshipImportCenterBatchRecord,
  type ScholarshipImportCenterStoredRecord,
} from '../../src/scholarships/import-center';

const batches: ScholarshipImportCenterBatchRecord[] = [{
  id: 'batch-real',
  sourceSystem: 'OFFICIAL_SITE',
  dataType: 'SCHOLARSHIPS',
  batchStatus: 'COMPLETED',
  totalRecords: 2,
  createdAt: new Date('2026-08-20T00:00:00Z'),
}, {
  id: 'batch-test',
  sourceSystem: 'TEST_FIXTURE',
  dataType: 'SCHOLARSHIPS',
  batchStatus: 'COMPLETED',
  totalRecords: 1,
  createdAt: new Date('2026-08-20T01:00:00Z'),
}];

function completePayload(overrides: Record<string, unknown> = {}) {
  return {
    scholarshipName: 'Qatar University Scholarship 2027',
    providerName: 'Qatar University',
    fundingCoverage: 'Fully funded',
    coverageDetails: 'Tuition and stipend',
    studyCountry: 'Qatar',
    degreeLevel: 'Doctorate',
    eligibilityCriteria: 'Academic merit',
    requiredDocuments: ['Transcript'],
    applicationDeadline: '2027-01-01',
    officialSourceUrl: 'https://example.edu/scholarship',
    metadata: {
      verificationState: 'VERIFIED',
      canonicalScreening: [{
        target: 'COUNTRY', state: 'RESOLVED', rawValue: 'Qatar', canonicalReferenceId: 'country-qa',
      }],
    },
    ...overrides,
  };
}

const records: ScholarshipImportCenterStoredRecord[] = [{
  id: 'rec-real-ready',
  batchId: 'batch-real',
  status: 'COMPLETE',
  rawPayload: completePayload(),
  promotedEntityId: null,
  sourceRowNumber: 1,
  createdAt: new Date('2026-08-20T00:01:00Z'),
  updatedAt: new Date('2026-08-20T00:01:00Z'),
}, {
  id: 'rec-real-incomplete',
  batchId: 'batch-real',
  status: 'INCOMPLETE',
  rawPayload: { scholarshipName: 'Incomplete Scholarship', metadata: { canonicalScreening: [] } },
  promotedEntityId: null,
  sourceRowNumber: 2,
  createdAt: new Date('2026-08-20T00:02:00Z'),
  updatedAt: new Date('2026-08-20T00:02:00Z'),
}, {
  id: 'rec-test',
  batchId: 'batch-test',
  status: 'COMPLETE',
  rawPayload: completePayload({ scholarshipName: 'Test Scholarship', _operationalClass: 'TEST' }),
  promotedEntityId: null,
  sourceRowNumber: 1,
  createdAt: new Date('2026-08-20T01:01:00Z'),
  updatedAt: new Date('2026-08-20T01:01:00Z'),
}];

function gateway(): IScholarshipImportCenterGateway {
  return {
    async listBatches(filters) {
      return batches.filter((batch) => !filters?.dataType || batch.dataType === filters.dataType);
    },
    async listRecords(filters) {
      let filtered = records.filter((record) => {
        const batch = batches.find((item) => item.id === record.batchId)!;
        return !filters?.dataType || batch.dataType === filters.dataType;
      });
      if (filters?.batchId) filtered = filtered.filter((record) => record.batchId === filters.batchId);
      if (filters?.status) filtered = filtered.filter((record) => record.status === filters.status);
      const page = filters?.page ?? 1;
      const pageSize = filters?.pageSize ?? 50;
      return {
        data: filtered.slice((page - 1) * pageSize, page * pageSize).map((record) => ({
          ...record,
          batch: batches.find((batch) => batch.id === record.batchId),
        })),
        total: filtered.length,
        page,
        pageSize,
      };
    },
    async getRecordById(id) {
      return records.find((record) => record.id === id) ?? null;
    },
    async getBatchById(id) {
      return batches.find((batch) => batch.id === id) ?? null;
    },
  };
}

function scholarshipRepository(existing: ScholarshipDto | null = null): IScholarshipRepository {
  return {
    findByDedupKey: vi.fn().mockResolvedValue(existing),
  } as unknown as IScholarshipRepository;
}

describe('WP12-7 ScholarshipImportCenterUseCases', () => {
  it('separates REAL and TEST records in operational overview counts', async () => {
    const service = new ScholarshipImportCenterUseCases(gateway(), scholarshipRepository());
    const overview = await service.getOverview('REAL');

    expect(overview.totalIncoming).toBe(2);
    expect(overview.newRecords).toBe(1);
    expect(overview.incomplete).toBe(1);
    expect(overview.readyToTransfer).toBe(1);
    expect(overview.sourceTotal).toBe(3);
    expect(overview.countsExact).toBe(true);
  });

  it('applies operational-class filtering before pagination', async () => {
    const service = new ScholarshipImportCenterUseCases(gateway(), scholarshipRepository());
    const page = await service.listRecords({ operationalClass: 'TEST', page: 1, pageSize: 1 });

    expect(page.data).toHaveLength(1);
    expect(page.data[0].id).toBe('rec-test');
    expect(page.filteredTotal).toBe(1);
    expect(page.countsExact).toBe(true);
  });

  it('returns real derived screening data without mutating an import record', async () => {
    const service = new ScholarshipImportCenterUseCases(gateway(), scholarshipRepository());
    const record = await service.getRecord('rec-real-ready');

    expect(record.rawSourceTitle).toBe('Qatar University Scholarship 2027');
    expect(record.cleanedScholarshipName).toContain('Qatar University Scholarship');
    expect(record.completeness.state).toBe('COMPLETE');
    expect(record.dedupe.state).toBe('NEW');
    expect(record.verification.state).toBe('VERIFIED');
    expect(record.canonical.state).toBe('CLEAR');
    expect(record.readyToTransfer).toBe(true);
  });

  it('does not invent review-decision persistence or WP12-10 atomic transfer', async () => {
    const service = new ScholarshipImportCenterUseCases(gateway(), scholarshipRepository());

    await expect(service.recordDecision({
      recordId: 'rec-real-ready',
      action: 'MERGE',
      actorId: 'admin-1',
    })).rejects.toThrow('SCHOLARSHIP_IMPORT_REVIEW_DECISION_PORT_NOT_CONFIGURED');

    await expect(service.transfer({
      recordId: 'rec-real-ready',
      actorId: 'admin-1',
    })).rejects.toThrow('SCHOLARSHIP_IMPORT_TRANSFER_PORT_NOT_CONFIGURED');
  });

  it('never marks NEEDS_REVIEW ready merely because its identity is available', async () => {
    const changed = records.map((record) => record.id === 'rec-real-ready' ? { ...record, rawPayload: completePayload({ _domainHandoff: { completeness: { state: 'NEEDS_REVIEW', identityReady: true, coreMissingFields: ['fundingCoverage'] }, canonicalScreening: [] } }) } : record);
    const localGateway = gateway();
    localGateway.getRecordById = async (id) => changed.find((record) => record.id === id) ?? null;
    localGateway.listRecords = async (filters) => ({ data: changed.filter((record) => !filters?.batchId || record.batchId === filters.batchId).slice(0, filters?.pageSize ?? 50), total: changed.length, page: filters?.page ?? 1, pageSize: filters?.pageSize ?? 50 });
    expect((await new ScholarshipImportCenterUseCases(localGateway, scholarshipRepository()).getRecord('rec-real-ready')).readyToTransfer).toBe(false);
  });

  it('uses only the latest canonical decision for a requirement', async () => {
    const decisions = { async record() { return { decisionId: 'x', recordedAt: '' }; }, async list() { return [
      { fieldOrRequirementKey: 'COUNTRY', resolutionType: 'RESOLVED', recordedAt: '2026-01-01T00:00:00.000Z' },
      { fieldOrRequirementKey: 'COUNTRY', resolutionType: 'REJECTED', recordedAt: '2026-01-02T00:00:00.000Z' },
    ] as any; } };
    const changed = records.map((record) => record.id === 'rec-real-ready' ? { ...record, rawPayload: completePayload({ _domainHandoff: { canonicalScreening: [{ requirementKey: 'COUNTRY', state: 'UNRESOLVED' }] } }) } : record);
    const localGateway = gateway(); localGateway.getRecordById = async (id) => changed.find((record) => record.id === id) ?? null;
    const view = await new ScholarshipImportCenterUseCases(localGateway, scholarshipRepository(), undefined, undefined, undefined, undefined, decisions).getRecord('rec-real-ready');
    expect(view.canonical.state).toBe('REVIEW_REQUIRED');
  });

  it('builds History only from real review/transfer envelopes and structured decisions', async () => {
    const processingNotes = appendScholarshipImportTransferReceipt(appendScholarshipImportReviewDecision(null, {
      version: 1, decisionId: 'decision-1', recordId: 'rec-real-ready', action: 'KEEP_CURRENT', actorId: 'reviewer-1', reason: 'checked', recordedAt: '2026-08-20T02:00:00.000Z', duplicateKey: null, targetScholarshipId: null, correlationId: 'corr-review', reviewFingerprint: 'fingerprint',
    }), { version: 1, recordId: 'rec-real-ready', scholarshipId: 'sch-1', actorId: 'transfer-1', transferredAt: '2026-08-20T05:00:00.000Z', mode: 'CREATE', correlationId: 'corr-transfer' });
    const stored = records.map((record) => record.id === 'rec-real-ready' ? { ...record, processingNotes } : record.id === 'rec-test' ? { ...record, promotedEntityId: 'legacy-without-receipt' } : record);
    const localGateway = gateway();
    localGateway.getRecordById = async (id) => stored.find((record) => record.id === id) ?? null;
    localGateway.listRecords = async (filters) => { const selected = stored.filter((record) => !filters?.dataType || batches.find((batch) => batch.id === record.batchId)?.dataType === filters.dataType); return { data: selected, total: selected.length, page: 1, pageSize: filters?.pageSize ?? 100 }; };
    const verification = { async record() { return { decisionId: 'v', recordedAt: '' }; }, async latest() { return null; }, async list(recordId: string) { return recordId === 'rec-real-ready' ? [{ decisionId: 'v1', recordId, state: 'VERIFIED' as const, actorId: 'verifier', reason: 'official', recordedAt: '2026-08-20T03:00:00.000Z' }] : []; } };
    const canonical = { async record() { return { decisionId: 'c', recordedAt: '' }; }, async list(recordId: string) { return recordId === 'rec-real-ready' ? [{ decisionId: 'c1', recordId, fieldOrRequirementKey: 'COUNTRY', canonicalEntityType: 'COUNTRY', canonicalId: 'ctr-1', rawValue: 'Qatar', resolutionType: 'RESOLVED' as const, actorId: 'resolver', recordedAt: '2026-08-20T04:00:00.000Z' }] : []; } };
    const history = await new ScholarshipImportCenterUseCases(localGateway, scholarshipRepository(), undefined, undefined, undefined, verification, canonical).listHistory();
    const review = history.events?.find((event) => event.eventType === 'REVIEW_DECISION'); const transfer = history.events?.find((event) => event.eventType === 'TRANSFER_RECEIPT');
    expect(review).toMatchObject({ occurredAt: '2026-08-20T02:00:00.000Z', data: { decisionId: 'decision-1', action: 'KEEP_CURRENT', actorId: 'reviewer-1' } });
    expect(transfer).toMatchObject({ occurredAt: '2026-08-20T05:00:00.000Z', data: { scholarshipId: 'sch-1', actorId: 'transfer-1', mode: 'CREATE' } });
    expect(history.events?.some((event) => event.eventType === 'VERIFICATION_DECISION')).toBe(true); expect(history.events?.some((event) => event.eventType === 'CANONICAL_RESOLUTION_DECISION')).toBe(true);
    expect(history.events?.filter((event) => event.eventType === 'TRANSFER_RECEIPT')).toHaveLength(1);
    expect(history.events?.[0].occurredAt).toBe('2026-08-20T05:00:00.000Z');
  });

  it('builds a read-only incoming/current diff when a canonical Scholarship exists', async () => {
    const probeService = new ScholarshipImportCenterUseCases(gateway(), scholarshipRepository());
    const probe = await probeService.getRecord('rec-real-ready');
    const existing = {
      id: 'sch-1',
      publicId: 'SCH-1',
      slug: 'qatar-scholarship',
      canonicalName: 'Qatar University Scholarship 2027',
      canonicalDedupKey: probe.dedupe.duplicateKey!,
      displayName: 'Old Qatar Scholarship Name',
      status: 'IMPORTED',
      completenessStatus: 'COMPLETE',
      providerName: 'Qatar University',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as ScholarshipDto;
    const service = new ScholarshipImportCenterUseCases(gateway(), scholarshipRepository(existing));
    const diff = await service.getDiff('rec-real-ready');

    expect(diff.existingScholarshipId).toBe('sch-1');
    expect(diff.mutationPerformed).toBe(false);
    expect(diff.fields.some((field) => field.state === 'CONFLICT')).toBe(true);
  });
});
