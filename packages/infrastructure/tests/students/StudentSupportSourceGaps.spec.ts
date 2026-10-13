import { describe, it, expect, vi } from 'vitest';
import { PrismaStudentWorkspaceRepository } from '../../src/students/PrismaStudentWorkspaceRepository';

function certificateFixture() {
  const receipts = new Map<string, any>();
  const certificates = new Map<string, any>();
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    studentWorkspace: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: 'w1', studentReferenceId: 's1', status: 'ACTIVE' }),
    },
    studentWorkspaceEventInbox: {
      findUnique: vi.fn().mockImplementation(({ where }) => receipts.get(where.eventId) ?? null),
      create: vi.fn().mockImplementation(({ data }) => {
        receipts.set(data.eventId, data);
        return data;
      }),
      findFirst: vi
        .fn()
        .mockImplementation(
          ({ where }) =>
            [...receipts.values()].find(
              (row) =>
                row.studentReferenceId === where.studentReferenceId &&
                row.sourceDomain === where.sourceDomain &&
                where.eventType.in.includes(row.eventType) &&
                row.processedAt &&
                row.failureCode === null &&
                row.payload.metadata?.replacesCertificateId === where.payload.equals,
            ) ?? null,
        ),
    },
    studentTimelineEntry: { create: vi.fn() },
    studentCertificateReadProjection: {
      findUnique: vi
        .fn()
        .mockImplementation(
          ({ where }) =>
            certificates.get(where.studentReferenceId_certificateId.certificateId) ?? null,
        ),
      upsert: vi.fn().mockImplementation(({ where, create, update }) => {
        const key = where.studentReferenceId_certificateId.certificateId;
        const row = certificates.has(key) ? { ...certificates.get(key), ...update } : create;
        certificates.set(key, row);
        return row;
      }),
      updateMany: vi.fn().mockImplementation(({ where, data }) => {
        const row = certificates.get(where.certificateId);
        if (
          !row ||
          row.studentReferenceId !== where.studentReferenceId ||
          where.status.notIn.includes(row.status)
        )
          return { count: 0 };
        certificates.set(where.certificateId, { ...row, ...data });
        return { count: 1 };
      }),
    },
  };
  const repo = new PrismaStudentWorkspaceRepository({ $transaction: (fn: any) => fn(tx) } as any);
  vi.spyOn(repo as any, 'refreshPersonalStatistics').mockResolvedValue(undefined);
  const event = (
    eventId: string,
    type: string,
    id: string,
    at: string,
    extra: Record<string, unknown> = {},
  ) => ({
    eventVersion: '1.0' as const,
    eventId,
    studentReferenceId: 's1',
    eventType: type,
    sourceDomain: 'CERTIFICATES',
    sourceReferenceId: id,
    title: 'Certificate lifecycle',
    occurredAt: new Date(at),
    metadata: { certificateId: id, status: 'ACTIVE', issuedAt: at, ...extra },
  });
  return { repo, tx, receipts, certificates, event };
}

describe('P15 late predecessor owner events', () => {
  it.each(['CertificateRenewed', 'CertificateReissued'])(
    'keeps a missing predecessor replaced after %s arrives first',
    async (type) => {
      const f = certificateFixture();
      const replacement = f.event('replace', type, 'new', '2026-10-12', {
        replacesCertificateId: 'old',
      });
      expect(await f.repo.ingestIntegrationEvent(replacement)).toBe(true);
      expect(
        await f.repo.ingestIntegrationEvent(
          f.event('issue-old', 'CertificateIssued', 'old', '2026-10-10'),
        ),
      ).toBe(true);
      expect(f.certificates.get('old').status).toBe('REISSUED');
      expect(f.certificates.get('old').sourceEventId).toBe('replace');
      expect(f.certificates.get('new').status).toBe('ACTIVE');
      expect(await f.repo.ingestIntegrationEvent(replacement)).toBe(false);
      expect(f.tx.studentTimelineEntry.create).toHaveBeenCalledTimes(2);
    },
  );
  it('does not let another student replacement mark this student certificate replaced', async () => {
    const f = certificateFixture();
    f.receipts.set('foreign', {
      studentReferenceId: 'another',
      sourceDomain: 'CERTIFICATES',
      eventType: 'CertificateRenewed',
      processedAt: new Date(),
      failureCode: null,
      payload: { metadata: { replacesCertificateId: 'old' } },
    });
    await f.repo.ingestIntegrationEvent(f.event('issue', 'CertificateIssued', 'old', '2026-10-10'));
    expect(f.certificates.get('old').status).toBe('ACTIVE');
    expect(f.tx.studentWorkspaceEventInbox.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentReferenceId: 's1',
          failureCode: null,
          processedAt: { not: null },
        }),
      }),
    );
  });
});

describe('P15 bounded source-specific triage', () => {
  const from = new Date('2026-10-10');
  const to = new Date('2026-10-13');
  it('binds status, time and owner to the cursor and uses the same pre-page predicate for totals', async () => {
    const db = {
      studentWorkspace: {
        count: vi.fn().mockResolvedValue(2),
        findMany: vi.fn().mockResolvedValue([
          { id: 'a', studentReferenceId: 's1', status: 'ACTIVE', version: 2, updatedAt: to },
          { id: 'b', studentReferenceId: 's2', status: 'ACTIVE', version: 1, updatedAt: from },
        ]),
      },
    };
    const repo = new PrismaStudentWorkspaceRepository(db as any, 's'.repeat(40));
    const input = {
      kind: 'OWNER_DEGRADED' as const,
      status: 'ACTIVE' as any,
      from,
      to,
      ownerDomain: 'certificates' as const,
      limit: 1,
    };
    const page = await repo.listSupportTriage(input);
    expect(page).toMatchObject({
      total: 2,
      hasMore: true,
      coverage: 'OBSERVED_OWNER_READS',
      ownerDomain: 'certificates',
    });
    const where = db.studentWorkspace.count.mock.calls[0][0].where;
    expect(where).toEqual({
      status: 'ACTIVE',
      supportOwnerReadObservations: {
        some: {
          ownerDomain: 'certificates',
          status: 'DEGRADED',
          checkedAt: { gte: from, lte: to },
        },
      },
    });
    expect(db.studentWorkspace.findMany.mock.calls[0][0].where.AND[0]).toEqual(where);
    await expect(
      repo.listSupportTriage({ ...input, status: 'SUSPENDED' as any, cursor: page.nextCursor! }),
    ).rejects.toThrow('STUDENT_SUPPORT_CURSOR_INVALID');
    await expect(
      repo.listSupportTriage({ ...input, ownerDomain: 'learning', cursor: page.nextCursor! }),
    ).rejects.toThrow('STUDENT_SUPPORT_CURSOR_INVALID');
    await expect(
      repo.listSupportTriage({ ...input, from: new Date('2026-10-11'), cursor: page.nextCursor! }),
    ).rejects.toThrow('STUDENT_SUPPORT_CURSOR_INVALID');
  });
  it('rejects ambiguous owner/window queries before reading the database', async () => {
    const db = { studentWorkspace: { count: vi.fn(), findMany: vi.fn() } };
    const repo = new PrismaStudentWorkspaceRepository(db as any, 's'.repeat(40));
    await expect(repo.listSupportTriage({ kind: 'OWNER_DEGRADED' })).rejects.toThrow(
      'STUDENT_SUPPORT_OWNER_WINDOW_REQUIRED',
    );
    await expect(
      repo.listSupportTriage({ kind: 'SYNC_FAILED', from: to, to: from }),
    ).rejects.toThrow('STUDENT_SUPPORT_TRIAGE_WINDOW_INVALID');
    expect(db.studentWorkspace.count).not.toHaveBeenCalled();
  });
  it('clears degraded health on a newer successful read, and cannot overwrite it with a late failure', async () => {
    let observation: any = {
      studentReferenceId: 's1',
      ownerDomain: 'learning',
      status: 'DEGRADED',
      checkedAt: from,
    };
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      studentWorkspace: { findUnique: vi.fn().mockResolvedValue({ id: 'w', status: 'ACTIVE' }) },
      studentSupportOwnerReadObservation: {
        findUnique: vi.fn().mockImplementation(() => observation),
        upsert: vi.fn().mockImplementation(({ update }) => {
          observation = { ...observation, ...update };
        }),
      },
      auditRecord: { create: vi.fn() },
      transactionalOutboxRecord: { create: vi.fn() },
    };
    const repo = new PrismaStudentWorkspaceRepository({ $transaction: (fn: any) => fn(tx) } as any);
    await repo.recordSupportOwnerReadObservation({
      studentReferenceId: 's1',
      ownerDomain: 'learning',
      status: 'AVAILABLE',
      checkedAt: to,
    });
    await repo.recordSupportOwnerReadObservation({
      studentReferenceId: 's1',
      ownerDomain: 'learning',
      status: 'DEGRADED',
      checkedAt: from,
    });
    expect(observation.status).toBe('AVAILABLE');
    expect(tx.studentSupportOwnerReadObservation.upsert).toHaveBeenCalledOnce();
    expect(tx.auditRecord.create).toHaveBeenCalledOnce();
    expect(tx.transactionalOutboxRecord.create).toHaveBeenCalledOnce();
    expect(JSON.stringify(tx.auditRecord.create.mock.calls)).not.toContain('payload');
  });
});
