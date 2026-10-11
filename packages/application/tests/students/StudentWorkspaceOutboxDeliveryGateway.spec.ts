import { describe, expect, it, vi } from 'vitest';
import { StudentWorkspaceOutboxDeliveryGateway } from '../../src/students/use-cases/StudentWorkspaceOutboxDeliveryGateway';
import { StudentWorkspaceOutboxWorker } from '../../src/students/use-cases/StudentWorkspaceOutboxWorker';

function fixture() {
  const students = {consumeIntegrationEvent:vi.fn().mockResolvedValue(true)};
  const assignments = {findByIdentityId:vi.fn().mockResolvedValue([{roleId:'student'}])};
  const identities = {findById:vi.fn().mockResolvedValue({type:'Human',status:'ACTIVE'})};
  const gateway = new StudentWorkspaceOutboxDeliveryGateway(students as any, assignments as any, identities as any);
  const entry = {
    id:'evt-1',domain:'CERTIFICATES',eventType:'CertificateRevoked',createdAt:new Date('2026-01-06T00:00:00Z'),
    aggregate:{aggregateId:'cert-1',aggregateType:'Certificate'},metadata:{schemaVersion:'1.0'},
    payload:{studentReferenceId:'student-1',certificateId:'cert-1',status:'REVOKED',publicId:'public-1',
      reason:'private revocation reason',recipientDisplayName:'Private Student Name'},
  };
  return {students,assignments,identities,gateway,entry};
}

describe('Student certificate owner-outbox bridge', () => {
  it('projects only public-scoped certificate fields and never private owner payload', async () => {
    const {students,gateway,entry}=fixture();
    await gateway.deliver(entry as any,{idempotencyKey:'evt-1'} as any);
    expect(students.consumeIntegrationEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventId:'evt-1',sourceDomain:'CERTIFICATES',studentReferenceId:'student-1',
      sourceReferenceId:'cert-1',eventType:'CertificateRevoked',
      metadata:expect.objectContaining({certificateId:'cert-1',status:'REVOKED'}),
    }));
    const sent=JSON.stringify(vi.mocked(students.consumeIntegrationEvent).mock.calls);
    expect(sent).not.toContain('recipientDisplayName');
    expect(sent).not.toContain('private revocation reason');
  });

  it('refuses mismatched certificate aggregate or missing student references', async () => {
    const {students,gateway,entry}=fixture();
    await expect(gateway.deliver({...entry,aggregate:{aggregateId:'foreign-cert'}} as any,{idempotencyKey:'evt-1'} as any))
      .rejects.toThrow('STUDENT_WORKSPACE_CERTIFICATE_EVENT_AGGREGATE_MISMATCH');
    await expect(gateway.deliver({...entry,payload:{certificateId:'cert-1'}} as any,{idempotencyKey:'evt-1'} as any))
      .rejects.toThrow('STUDENT_WORKSPACE_CERTIFICATE_EVENT_REFERENCE_REQUIRED');
    expect(students.consumeIntegrationEvent).not.toHaveBeenCalled();
  });

  it('cannot project certificate data for a principal without a student role', async () => {
    const {students,gateway,entry,assignments}=fixture();
    assignments.findByIdentityId.mockResolvedValue([]);
    await gateway.deliver(entry as any,{idempotencyKey:'evt-1'} as any);
    expect(students.consumeIntegrationEvent).not.toHaveBeenCalled();
  });

  it('maps expiry and artifact owner events without internal render payloads', async () => {
    const {gateway,students,entry}=fixture();
    await gateway.deliver({
      ...entry,id:'evt-expire',eventType:'CertificateExpired',
      payload:{studentReferenceId:'student-1',certificateId:'cert-1',expiredAt:'2026-01-06T00:00:00Z'},
    } as any,{idempotencyKey:'evt-expire'} as any);
    expect(students.consumeIntegrationEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType:'CertificateExpired',metadata:expect.objectContaining({status:'EXPIRED'}),
    }));
    students.consumeIntegrationEvent.mockClear();
    await gateway.deliver({
      ...entry,id:'evt-artifact',eventType:'CertificateArtifactsRendered',
      payload:{studentReferenceId:'student-1',certificateId:'cert-1',certificatePdfAssetId:'asset-1',renderMetadata:{secret:'never-forward'}},
    } as any,{idempotencyKey:'evt-artifact'} as any);
    const mapped=vi.mocked(students.consumeIntegrationEvent).mock.calls[0][0];
    expect(mapped.metadata).toHaveProperty('certificatePdfAssetId','asset-1');
    expect(JSON.stringify(mapped)).not.toContain('never-forward');
  });

  it('claims certificate lifecycle events but leaves rendering to P14', async () => {
    const dispatcher={dispatchBatch:vi.fn().mockResolvedValue({claimed:0,processed:0,failed:0,exhausted:0})};
    const worker=new StudentWorkspaceOutboxWorker(dispatcher as any);
    await worker.runCertificatesOnce('worker-test');
    expect(dispatcher.dispatchBatch).toHaveBeenCalledWith(expect.objectContaining({
      workerId:'worker-test',domain:'CERTIFICATES',
      eventTypes:['CertificateIssued','CertificateRevoked','CertificateReissued','CertificateRenewed','CertificateExpired','CertificateArtifactsRendered'],
    }));
  });
});
