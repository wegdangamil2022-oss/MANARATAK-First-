import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { APPROVED_CERTIFICATE_DESIGN, approvedCertificateCopy } from '@manaratak/shared';
import {
  CertificateUseCases,
  CertificateCompletionEventConsumer,
  CertificateArtifactRenderUseCase,
  CertificateReadModelService,
} from '@manaratak/application';
import {
  ProviderNeutralCertificateRenderingService,
  CertificateStudentDashboardReadGateway,
} from '@manaratak/infrastructure';
import { CertificateStatus, CertificateTemplateStatus, CourseOriginType } from '@manaratak/domain';
import { StudentWorkspaceRouter } from '../../../../src/presentation/api/router/StudentWorkspaceRouter';

/** Integration across real application/render/API boundaries; persistence and custody are test doubles. */
function harness() {
  const issuer: any = {
    id: 'issuer',
    publicId: 'issuer-public',
    code: 'MANARATAK',
    name: 'MANARATAK',
    issuerType: 'MANARATAK',
    status: 'ACTIVE',
    issuerLogoAssetId: 'logo',
    signingKeyReference: 'development-only',
  };
  const version: any = {
    id: 'version',
    templateId: 'template',
    issuerId: 'issuer',
    versionNumber: '1.0.0',
    language: 'BILINGUAL',
    layout: 'LANDSCAPE',
    status: CertificateTemplateStatus.ACTIVE,
    validityPolicy: 'PERMANENT',
    requiresRevalidation: false,
    accentColor: '#142B5F',
    secondaryColor: '#D6A43B',
    ...approvedCertificateCopy,
    metadata: { designId: APPROVED_CERTIFICATE_DESIGN },
  };
  const template: any = {
    ...version,
    id: 'template',
    code: 'MNR-SIGNATURE',
    templateVersion: '1.0.0',
    currentVersionId: 'version',
    currentVersion: version,
  };
  const course: any = {
    id: 'course',
    displayName: 'دورة المنح الدراسية',
    originType: CourseOriginType.NATIVE_MANARATAK_COURSE,
    certificateAvailable: true,
    optionalFields: {
      certificateDisplayNames: { ar: 'دورة المنح الدراسية', en: 'Scholarships Course' },
    },
  };
  let certificate: any = null;
  const artifacts = new Map<string, { bytes: Uint8Array; mimeType: string }>();
  const checkpoint: Record<string, string> = {};
  const repository: any = {
    findBySourceEventId: async (id: string) =>
      certificate?.sourceEventId === id ? certificate : null,
    findBySourceCompletionId: async () => certificate,
    findActiveTemplateByName: async () => template,
    findIssuerById: async () => issuer,
    findTemplateVersionById: async () => version,
    issue: async (data: any) => {
      certificate = {
        ...data,
        id: randomUUID(),
        issuedAt: data.issuedAt ?? new Date(),
        skills: [],
        competencies: [],
      };
      return certificate;
    },
    findById: async () => certificate,
    recordVerification: async () => {},
    findByVerificationCode: async (code: string) =>
      certificate?.verificationCode === code ? certificate : null,
    listByStudent: async (student: string) =>
      certificate?.studentReferenceId === student ? [certificate] : [],
    findForStudent: async (id: string, student: string) =>
      certificate?.id === id && certificate?.studentReferenceId === student ? certificate : null,
    attachArtifacts: async (data: any) => {
      certificate = {
        ...certificate,
        ...data,
        metadata: { ...certificate.metadata, render: data.renderMetadata },
      };
      return certificate;
    },
    checkpointRender: async (_id: string, _fingerprint: string, kind: string, assetId?: string) => {
      if (assetId) checkpoint[kind] = assetId;
      return { ...checkpoint };
    },
  };
  const assets: any = {
    findById: async (id: any) => {
      const artifact = artifacts.get(id.value);
      return artifact
        ? {
            state: 'ACTIVE',
            classification: 'INTERNAL',
            owner: { ownerType: 'Certificate', ownerId: certificate.id },
            metadata: { mimeType: artifact.mimeType },
          }
        : null;
    },
  };
  const cases = new CertificateUseCases(
    repository,
    { findById: async () => course } as any,
    assets,
    {
      signingKeyReference: issuer.signingKeyReference,
      signingSecret: 'test-only-not-for-production',
      productionLike: false,
      publicVerificationBaseUrl: 'https://example.org',
    },
    undefined,
    {
      findById: async () => ({
        user: { profile: { props: { displayName: 'وجدان جميل عبدالهادي علي السروري' } } },
      }),
    } as any,
    { getLearningVersion: async () => ({ course }) } as any,
  );
  const rendering = new CertificateArtifactRenderUseCase(
    repository,
    new ProviderNeutralCertificateRenderingService(),
    {
      store: async ({ artifact }) => {
        const id = randomUUID();
        artifacts.set(id, artifact);
        return id;
      },
    },
    cases,
  );
  const consumer = new CertificateCompletionEventConsumer(cases, rendering);
  const reader = new CertificateReadModelService(repository, cases);
  const app = express();
  app.use(express.json());
  app.use(
    '/student',
    StudentWorkspaceRouter.create({
      certificateReadModelService: reader,
      tokenProvider: {
        verifyAccessToken: async (token: string) => ({ userId: token, sessionId: 'session' }),
      },
      sessionManager: { isSessionActive: async () => true },
      principalAccessValidator: { isAuthenticationAllowed: async () => true },
      roleAssignmentRepository: { findByIdentityId: async () => [{ roleId: 'student' }] },
      apiIdempotencyStore: {
        begin: async () => ({ kind: 'STARTED', scopeHash: randomUUID(), leaseToken: 'lease' }),
        complete: async () => {},
      },
      processAssetLifecycleUseCase: {
        requestDeliveryGrant: async ({ assetId }: any) => ({
          url: `https://storage.example.org/private/${assetId}`,
          headers: {},
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        }),
      },
      assetRecordRepository: assets,
    } as any),
  );
  app.use((error: any, _req: any, res: any, _next: any) =>
    res
      .status(error.message === 'CERTIFICATE_NOT_FOUND' ? 404 : 409)
      .json({ error: error.message }),
  );
  const event: any = {
    id: 'event',
    domain: 'COURSES',
    eventType: 'CourseCompleted',
    createdAt: new Date(),
    metadata: { eventVersion: '1.0.0' },
    payload: {
      courseId: 'course',
      courseVersion: 1,
      studentReferenceId: 'student-owner',
      completionId: 'completion',
      completedAt: new Date().toISOString(),
      eligibleForCertificate: true,
      sourcePhase: 'Phase 13 - Learning Platform',
      certificateOwnerPhase: 'Phase 14 - Enterprise Certificates Platform',
    },
  };
  return {
    app,
    consumer,
    event,
    reader,
    cases,
    artifacts,
    get certificate() {
      return certificate;
    },
  };
}
describe('completion → certificate → student account → private delivery', () => {
  it('issues one signed certificate, renders the adopted PDF/SVG, and exposes it to its owner in account and API', async () => {
    const h = harness();
    await h.consumer.consume(h.event);
    expect(h.certificate.status).toBe(CertificateStatus.ACTIVE);
    const list = await request(h.app)
      .get('/student/certificates')
      .set('Authorization', 'Bearer student-owner');
    expect(list.status).toBe(200);
    expect(list.body.data[0].certificateId).toBe(h.certificate.id);
    const account = await new CertificateStudentDashboardReadGateway(h.reader).listForStudent(
      'student-owner',
    );
    expect(account[0].certificatePdfAssetId).toBe(h.certificate.certificatePdfAssetId);
    const svg = Buffer.from(h.artifacts.get(h.certificate.previewImageAssetId)!.bytes).toString();
    expect(svg).toContain('Scholarships Course');
    expect(svg).toContain('دورة المنح الدراسية');
    expect(svg).toContain('قد أتم/ت بنجاح');
    const verified = await h.reader.verifyPublic(h.certificate.verificationCode);
    expect(verified.isValid).toBe(true);
    for (const kind of ['pdf', 'preview']) {
      const grant = await request(h.app)
        .post(`/student/certificates/${h.certificate.id}/artifacts/${kind}/delivery-grant`)
        .set('Authorization', 'Bearer student-owner')
        .set('Idempotency-Key', randomUUID())
        .send({});
      expect(grant.status).toBe(200);
      expect(grant.body.url).toContain('/private/');
    }
    await h.consumer.consume(h.event);
    expect(h.artifacts.size).toBe(3);
  });
  it('prevents another student from seeing or downloading the certificate and prevents revoked delivery', async () => {
    const h = harness();
    await h.consumer.consume(h.event);
    const list = await request(h.app)
      .get('/student/certificates')
      .set('Authorization', 'Bearer other-student');
    expect(list.body.data).toEqual([]);
    const grant = await request(h.app)
      .post(`/student/certificates/${h.certificate.id}/artifacts/pdf/delivery-grant`)
      .set('Authorization', 'Bearer other-student')
      .set('Idempotency-Key', randomUUID())
      .send({});
    expect(grant.status).toBe(404);
    h.certificate.status = CertificateStatus.REVOKED;
    await expect(
      h.cases.deliveryArtifact(h.certificate.id, 'pdf', 'student-owner'),
    ).rejects.toThrow('STATE_INVALID');
  });
});
