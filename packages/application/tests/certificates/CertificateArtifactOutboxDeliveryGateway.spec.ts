import { describe, it, expect, vi } from 'vitest';
import { CertificateArtifactOutboxDeliveryGateway } from '../../src/certificates/use-cases/CertificateArtifactOutboxDeliveryGateway';
import { CertificateCompletionOutboxWorker } from '../../src/certificates/use-cases/CertificateCompletionOutboxWorker';
const entry: any = {
  id: 'command',
  domain: 'CERTIFICATES',
  eventType: 'CertificateRenderRequested',
  payload: { certificateId: 'c' },
  metadata: { sourcePhase: 'Phase14', schemaVersion: '1.0' },
  aggregate: { domain: 'CERTIFICATES', aggregateType: 'Certificate', aggregateId: 'c' },
};
describe('durable certificate rendering after issuance or reviewed revalidation', () => {
  it('renders only the persisted canonical certificate command', async () => {
    const renderer: any = { renderCertificate: vi.fn() };
    await new CertificateArtifactOutboxDeliveryGateway(renderer).deliver(entry, {
      idempotencyKey: entry.id,
    });
    expect(renderer.renderCertificate).toHaveBeenCalledWith('c', 'phase14-renderer', 'command');
  });
  for (const patch of [
    { domain: 'COURSES' },
    { eventType: 'CertificateIssued' },
    { metadata: { sourcePhase: 'Caller', schemaVersion: '1.0' } },
    { aggregate: { aggregateType: 'Certificate', aggregateId: 'other' } },
  ])
    it('rejects untrusted or mismatched rendering commands', async () => {
      const renderer: any = { renderCertificate: vi.fn() };
      await expect(
        new CertificateArtifactOutboxDeliveryGateway(renderer).deliver(
          { ...entry, ...patch },
          { idempotencyKey: entry.id },
        ),
      ).rejects.toThrow('COMMAND_');
      expect(renderer.renderCertificate).not.toHaveBeenCalled();
    });
  it('dispatches artifact commands separately from completion fanout and expires due certificates', async () => {
    const result = { claimed: 1, processed: 1, failed: 0, exhausted: 0, leaseLost: 0 };
    const completions: any = { dispatchBatch: vi.fn(async () => result) },
      artifacts: any = { dispatchBatch: vi.fn(async () => result) },
      maintenance = { expireDue: vi.fn(async () => 0) };
    expect(
      await new CertificateCompletionOutboxWorker(completions, {}, maintenance, artifacts).runOnce(
        'worker',
      ),
    ).toEqual({ ...result, claimed: 2, processed: 2 });
    expect(artifacts.dispatchBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'CERTIFICATES',
        eventTypes: ['CertificateRenderRequested'],
        maxAttempts: 8,
      }),
    );
    expect(maintenance.expireDue).toHaveBeenCalledWith(expect.any(Date), 'worker');
  });
});

import { PrismaCertificateRepository } from '../../../infrastructure/src/certificates/PrismaCertificateRepository';
it('atomically queues document generation after independent revalidation approval', async () => {
  const updatedAt = new Date();
  const current = {
    id: 'c',
    status: 'ACTIVE',
    updatedAt,
    requiresRevalidation: true,
    metadata: { issuedBy: 'maker' },
  };
  const tx: any = {
    $queryRaw: vi.fn(),
    certificate: {
      findUnique: async () => current,
      update: vi.fn(async ({ data }: any) => ({ ...current, ...data })),
    },
    certificateLedgerEntry: { create: vi.fn() },
    auditRecord: { create: vi.fn() },
    transactionalOutboxRecord: { create: vi.fn() },
  };
  const repo = new PrismaCertificateRepository({ $transaction: async (fn: any) => fn(tx) } as any);
  await repo.recordReview(
    'c',
    'REVALIDATION_APPROVED',
    {
      evidenceAssetId: 'evidence',
      expectedUpdatedAt: updatedAt.toISOString(),
      validUntil: new Date(Date.now() + 86400000).toISOString(),
    },
    { actorId: 'checker', reason: 'Canonical evidence reviewed' },
  );
  expect(
    tx.transactionalOutboxRecord.create.mock.calls.map((call: any) => call[0].data.eventType),
  ).toEqual(['CertificateRevalidated', 'CertificateRenderRequested']);
  expect(tx.transactionalOutboxRecord.create.mock.calls[1][0].data).toMatchObject({
    domain: 'CERTIFICATES',
    aggregateType: 'Certificate',
    aggregateId: 'c',
    payload: { certificateId: 'c' },
  });
});
