import { randomUUID } from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  AttachCertificateArtifactsDto,
  CertificateAnalyticsDto,
  CertificateDto,
  CertificateIssuerDto,
  CertificateIssuerStatus,
  CertificateLedgerEntryDto,
  CertificateListQuery,
  CertificateListResult,
  CertificateMutationContext,
  CertificateStatus,
  CertificateTemplateDto,
  CertificateTemplateVersionDto,
  CertificateTemplateStatus,
  CreateCertificateIssuerDto,
  CreateCertificateTemplateDto,
  ICertificateRepository,
  IssueCertificateDto,
  ReissueCertificateDto,
  RevokeCertificateDto,
  UpdateCertificateIssuerDto,
  UpdateCertificateTemplateDto,
} from '@manaratak/domain';

const json = (value: unknown): Prisma.InputJsonValue | undefined =>
  value === undefined ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);

const templateTransitions: Record<CertificateTemplateStatus, CertificateTemplateStatus[]> = {
  DRAFT: [CertificateTemplateStatus.PENDING_APPROVAL],
  PENDING_APPROVAL: [CertificateTemplateStatus.DRAFT, CertificateTemplateStatus.APPROVED],
  APPROVED: [CertificateTemplateStatus.ACTIVE, CertificateTemplateStatus.DRAFT],
  ACTIVE: [CertificateTemplateStatus.DEPRECATED],
  DEPRECATED: [CertificateTemplateStatus.ARCHIVED],
  ARCHIVED: [],
  RETIRED: [],
};

export class PrismaCertificateRepository implements ICertificateRepository {
  public constructor(private readonly prisma: PrismaClient) {}
  private get db(): any { return this.prisma as any; }

  private readonly templateInclude = {
    issuer: true,
    currentVersion: true,
    versions: { orderBy: { createdAt: 'desc' } },
  } as const;

  public async createIssuer(data: CreateCertificateIssuerDto, context: CertificateMutationContext): Promise<CertificateIssuerDto> {
    return this.db.$transaction(async (tx: any) => {
      const issuer = await tx.certificateIssuer.create({ data: { ...data, status: 'PENDING_APPROVAL', metadata: json({ ...data.metadata, trust: { createdBy: context.actorId, approvedBy: null } }) } });
      await this.appendGovernanceMutation(tx, 'CertificateIssuer', issuer.id, 'CERTIFICATE_ISSUER_CREATED', context, { issuerCode: issuer.code }, 'CertificateIssuerCreated');
      return this.issuer(issuer);
    });
  }

  public async updateIssuer(id: string, data: UpdateCertificateIssuerDto, context: CertificateMutationContext): Promise<CertificateIssuerDto> {
    return this.db.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT id FROM "CertificateIssuer" WHERE id = ${id} FOR UPDATE`;
      const current = await tx.certificateIssuer.findUnique({ where: { id } });
      if (!current) throw new Error('CERTIFICATE_ISSUER_NOT_FOUND');
      if (!context.expectedIssuerUpdatedAt) throw new Error('CERTIFICATE_ISSUER_PRECONDITION_REQUIRED');
      if (new Date(current.updatedAt).toISOString() !== context.expectedIssuerUpdatedAt) throw new Error('CERTIFICATE_ISSUER_STALE');
      const critical = ['name', 'issuerType', 'universityId', 'organizationId', 'signingKeyReference', 'accreditationAuthority', 'accreditationReference', 'issuerLogoAssetId'] as const;
      const authorityChanged = critical.some(key => data[key] !== undefined && data[key] !== current[key]);
      if (current.status === 'ACTIVE' && authorityChanged) throw new Error('CERTIFICATE_ISSUER_AUTHORITY_IMMUTABLE');
      const trust = current.metadata?.trust;
      let metadata = current.metadata;
      if (data.status === 'ACTIVE') {
        if (!context.issuerApproval || authorityChanged) throw new Error('CERTIFICATE_ISSUER_APPROVAL_REQUIRED');
        if (!trust?.createdBy || trust.createdBy === context.actorId) throw new Error('CERTIFICATE_ISSUER_MAKER_CHECKER_REQUIRED');
        metadata = { ...metadata, trust: { ...trust, approvedBy: context.actorId, approvedAt: new Date().toISOString(), ...context.issuerApproval } };
      } else if (authorityChanged) {
        metadata = { ...metadata, trust: { createdBy: context.actorId, approvedBy: null } };
        data = { ...data, status: 'PENDING_APPROVAL' };
      }
      const { metadata: _untrustedMetadata, ...fields } = data;
      const issuer = await tx.certificateIssuer.update({ where: { id }, data: { ...fields, metadata: json(metadata) } });
      await this.appendGovernanceMutation(tx, 'CertificateIssuer', issuer.id, 'CERTIFICATE_ISSUER_UPDATED', context, { issuerCode: issuer.code }, 'CertificateIssuerUpdated');
      return this.issuer(issuer);
    });
  }

  public async findIssuerById(id: string): Promise<CertificateIssuerDto | null> {
    const row = await this.db.certificateIssuer.findUnique({ where: { id } });
    return row ? this.issuer(row) : null;
  }
  public async findIssuerByCode(code: string): Promise<CertificateIssuerDto | null> {
    const row = await this.db.certificateIssuer.findUnique({ where: { code } });
    return row ? this.issuer(row) : null;
  }
  public async listIssuers(): Promise<CertificateIssuerDto[]> {
    return (await this.db.certificateIssuer.findMany({ orderBy: [{ status: 'asc' }, { name: 'asc' }] })).map((row: any) => this.issuer(row));
  }

  public async createTemplate(data: CreateCertificateTemplateDto, context: CertificateMutationContext): Promise<CertificateTemplateDto> {
    return this.db.$transaction(async (tx: any) => {
      const issuer = await this.requireActiveIssuer(tx, data.issuerId);
      const template = await tx.certificateTemplate.create({
        data: {
          publicId: data.publicId,
          code: data.code,
          name: data.name,
          nameAr: data.nameAr,
          nameEn: data.nameEn,
          status: CertificateTemplateStatus.DRAFT,
          issuerId: issuer.id,
        },
      });
      const version = await tx.certificateTemplateVersion.create({
        data: this.templateVersionCreateData(template.id, data.templateVersion, CertificateTemplateStatus.DRAFT, data, context.actorId),
      });
      const updated = await tx.certificateTemplate.update({
        where: { id: template.id },
        data: { currentVersionId: version.id },
        include: this.templateInclude,
      });
      await this.appendGovernanceMutation(tx, 'CertificateTemplate', template.id, 'CERTIFICATE_TEMPLATE_CREATED', context, { versionId: version.id, versionNumber: version.versionNumber }, 'CertificateTemplateCreated');
      return this.template(updated);
    });
  }

  public async updateTemplate(id: string, data: UpdateCertificateTemplateDto, context: CertificateMutationContext): Promise<CertificateTemplateDto> {
    return this.db.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT id FROM "CertificateTemplate" WHERE id = ${id} FOR UPDATE`;
      const current = await tx.certificateTemplate.findUnique({ where: { id }, include: this.templateInclude });
      if (!current) throw new Error('CERTIFICATE_TEMPLATE_NOT_FOUND');
      if (!context.expectedTemplateVersionId || !context.expectedTemplateStatus) throw new Error('CERTIFICATE_TEMPLATE_PRECONDITION_REQUIRED');
      if (current.currentVersionId !== context.expectedTemplateVersionId || current.status !== context.expectedTemplateStatus) throw new Error('CERTIFICATE_TEMPLATE_STALE');
      if (current.status !== CertificateTemplateStatus.DRAFT) throw new Error('CERTIFICATE_TEMPLATE_IMMUTABLE');
      if (!current.currentVersion) throw new Error('CERTIFICATE_TEMPLATE_CURRENT_VERSION_REQUIRED');
      const issuerId = data.issuerId ?? current.currentVersion.issuerId ?? current.issuerId;
      await this.requireActiveIssuer(tx, issuerId);
      const versionNumber = data.templateVersion ?? this.bumpPatch(current.currentVersion.versionNumber);
      const parseVersion = (value: string) => {
        if (!/^\d+\.\d+\.\d+$/.test(value)) throw new Error('CERTIFICATE_TEMPLATE_VERSION_INVALID');
        const parts = value.split('.').map(Number);
        if (!parts.every(Number.isSafeInteger)) throw new Error('CERTIFICATE_TEMPLATE_VERSION_INVALID');
        return parts;
      };
      const before = parseVersion(current.currentVersion.versionNumber), after = parseVersion(versionNumber);
      const changed = after.findIndex((part, index) => part !== before[index]);
      if (changed < 0 || after[changed] < before[changed]) throw new Error('CERTIFICATE_TEMPLATE_VERSION_MUST_ADVANCE');
      const versionInput = this.mergeTemplateVersion(current.currentVersion, data, issuerId);
      const version = await tx.certificateTemplateVersion.create({
        data: this.templateVersionCreateData(current.id, versionNumber, CertificateTemplateStatus.DRAFT, versionInput, context.actorId),
      });
      const updated = await tx.certificateTemplate.update({
        where: { id },
        data: {
          name: data.name ?? current.name,
          nameAr: data.nameAr ?? current.nameAr,
          nameEn: data.nameEn ?? current.nameEn,
          issuerId,
          currentVersionId: version.id,
        },
        include: this.templateInclude,
      });
      await this.appendGovernanceMutation(tx, 'CertificateTemplate', id, 'CERTIFICATE_TEMPLATE_VERSION_CREATED', context, { versionId: version.id, versionNumber }, 'CertificateTemplateVersionCreated');
      return this.template(updated);
    });
  }

  public async transitionTemplate(id: string, status: CertificateTemplateStatus, context: CertificateMutationContext): Promise<CertificateTemplateDto> {
    return this.db.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT id FROM "CertificateTemplate" WHERE id = ${id} FOR UPDATE`;
      const current = await tx.certificateTemplate.findUnique({ where: { id }, include: this.templateInclude });
      if (!current) throw new Error('CERTIFICATE_TEMPLATE_NOT_FOUND');
      if (!context.expectedTemplateVersionId || !context.expectedTemplateStatus) throw new Error('CERTIFICATE_TEMPLATE_PRECONDITION_REQUIRED');
      if (current.currentVersionId !== context.expectedTemplateVersionId || current.status !== context.expectedTemplateStatus) throw new Error('CERTIFICATE_TEMPLATE_STALE');
      if (!current.currentVersion) throw new Error('CERTIFICATE_TEMPLATE_CURRENT_VERSION_REQUIRED');
      const currentStatus = current.status as CertificateTemplateStatus;
      if (!templateTransitions[currentStatus].includes(status)) throw new Error('CERTIFICATE_TEMPLATE_TRANSITION_INVALID');
      if (status === CertificateTemplateStatus.APPROVED && current.currentVersion.createdBy === context.actorId) {
        throw new Error('CERTIFICATE_TEMPLATE_MAKER_CHECKER_REQUIRED');
      }
      if (status === CertificateTemplateStatus.ACTIVE) {
        if (!current.currentVersion.approvedBy) throw new Error('CERTIFICATE_TEMPLATE_APPROVAL_REQUIRED');
        await this.requireActiveIssuer(tx, current.currentVersion.issuerId);
        await this.assertFrozenVisualAssets(tx, current.currentVersion);
      }
      const versionUpdate: Record<string, unknown> = { status };
      if (status === CertificateTemplateStatus.DRAFT || status === CertificateTemplateStatus.PENDING_APPROVAL) {
        versionUpdate.approvedBy = null; versionUpdate.approvedAt = null;
      }
      if (status === CertificateTemplateStatus.APPROVED) {
        versionUpdate.approvedBy = context.actorId;
        versionUpdate.approvedAt = new Date();
      }
      await tx.certificateTemplateVersion.update({ where: { id: current.currentVersion.id }, data: versionUpdate });
      const updated = await tx.certificateTemplate.update({ where: { id }, data: { status }, include: this.templateInclude });
      await this.appendGovernanceMutation(tx, 'CertificateTemplate', id, `CERTIFICATE_TEMPLATE_${status}`, context, { versionId: current.currentVersion.id, versionNumber: current.currentVersion.versionNumber, fromStatus: currentStatus, toStatus: status }, 'CertificateTemplateStatusChanged');
      return this.template(updated);
    });
  }

  public async findTemplateById(id: string): Promise<CertificateTemplateDto | null> {
    const row = await this.db.certificateTemplate.findUnique({ where: { id }, include: this.templateInclude });
    return row ? this.template(row) : null;
  }

  public async findTemplateVersionById(id: string): Promise<CertificateTemplateVersionDto | null> {
    const row = await this.db.certificateTemplateVersion.findUnique({ where: { id } });
    return row ? this.templateVersion(row) : null;
  }

  public async findActiveTemplateByName(name: string): Promise<CertificateTemplateDto | null> {
    // Legacy method name retained as a port; selection is canonical, never by display label.
    if (name !== 'MANARATAK Signature Certificate') throw new Error('CERTIFICATE_DEFAULT_TEMPLATE_BINDING_INVALID');
    const row = await this.db.certificateTemplate.findUnique({ where: { code: 'MNR-SIGNATURE' }, include: this.templateInclude });
    if (!row || row.status !== 'ACTIVE' || row.issuer?.issuerType !== 'MANARATAK' || row.issuer?.status !== 'ACTIVE') return null;
    return this.template(row);
  }

  public async listTemplates(): Promise<CertificateTemplateDto[]> {
    return (await this.db.certificateTemplate.findMany({ orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }], include: this.templateInclude })).map((row: any) => this.template(row));
  }

  public async checkpointRender(id:string,fingerprint:string,stage:'BEGIN'|'PDF'|'PREVIEW'|'QR'|'FAILED'|'COMPLETE',assetId?:string): Promise<Record<string,string>> {
    return this.db.$transaction(async(tx:any)=>{
      await tx.$queryRaw`SELECT id FROM "Certificate" WHERE id = ${id} FOR UPDATE`;
      const certificate = await tx.certificate.findUnique({where:{id}});
      if(!certificate) throw new Error('CERTIFICATE_NOT_FOUND');
      if(certificate.status !== 'ACTIVE' && stage !== 'FAILED') throw new Error('CERTIFICATE_ARTIFACT_STATE_INVALID');
      const previous = certificate.metadata?.renderJob;
      if(previous && previous.fingerprint !== fingerprint) throw new Error('CERTIFICATE_RENDER_FINGERPRINT_CONFLICT');
      if(stage === 'BEGIN' && (previous?.attempts ?? 0) >= 8) throw new Error('CERTIFICATE_RENDER_RECOVERY_REQUIRED');
      const job = {...previous,fingerprint,state:stage === 'FAILED' ? 'RECOVERY_REQUIRED' : stage === 'COMPLETE' ? 'COMPLETE' : 'RUNNING',attempts:(previous?.attempts ?? 0)+(stage === 'BEGIN' ? 1 : 0),updatedAt:new Date().toISOString(),stored:{...previous?.stored}};
      if(assetId && ['PDF','PREVIEW','QR'].includes(stage)) {
        if(job.stored[stage] && job.stored[stage] !== assetId) throw new Error('CERTIFICATE_ARTIFACT_IMMUTABLE');
        job.stored[stage]=assetId;
      }
      await tx.certificate.update({where:{id},data:{metadata:json({...certificate.metadata,renderJob:job})}});
      return job.stored;
    });
  }

  public async recordReview(id: string, kind: 'RECIPIENT_CORRECTION_REQUESTED' | 'RECIPIENT_CORRECTION_APPROVED' | 'REVALIDATION_APPROVED', input: {name?:string;evidenceAssetId:string;validUntil?:string;expectedUpdatedAt:string}, context: CertificateMutationContext): Promise<CertificateDto> {
    return this.db.$transaction(async (tx:any) => {
      await tx.$queryRaw`SELECT id FROM "Certificate" WHERE id = ${id} FOR UPDATE`;
      const current = await tx.certificate.findUnique({where:{id}});
      if (!current) throw new Error('CERTIFICATE_NOT_FOUND');
      if (new Date(current.updatedAt).toISOString() !== input.expectedUpdatedAt) throw new Error('CERTIFICATE_REVIEW_STALE');
      if (!context.reason?.trim()) throw new Error('CERTIFICATE_REVIEW_REASON_REQUIRED');
      const metadata = {...current.metadata};
      if (kind === 'RECIPIENT_CORRECTION_REQUESTED') {
        if(current.status !== 'REVOKED' || !input.name?.trim() || input.name === current.recipientDisplayName) throw new Error('CERTIFICATE_CORRECTION_STATE_INVALID');
        metadata.recipientCorrection = {id:randomUUID(),name:input.name,evidenceAssetId:input.evidenceAssetId,createdBy:context.actorId,requestedAt:new Date().toISOString(),state:'PENDING_APPROVAL'};
      } else if (kind === 'RECIPIENT_CORRECTION_APPROVED') {
        const request = metadata.recipientCorrection;
        if(current.status !== 'REVOKED' || request?.state !== 'PENDING_APPROVAL' || request.name !== input.name || request.evidenceAssetId !== input.evidenceAssetId) throw new Error('CERTIFICATE_CORRECTION_STATE_INVALID');
        if (request.createdBy === context.actorId) throw new Error('CERTIFICATE_CORRECTION_MAKER_CHECKER_REQUIRED');
        metadata.recipientCorrection = {...request,state:'APPROVED',approvedBy:context.actorId,approvedAt:new Date().toISOString()};
      } else {
        if (!current.requiresRevalidation || current.status !== 'ACTIVE' || !input.validUntil || new Date(input.validUntil)<=new Date() || new Date(input.validUntil).getTime()>Date.now()+365*86400000 || current.actorId === context.actorId || current.metadata?.issuedBy === context.actorId) throw new Error('CERTIFICATE_REVALIDATION_STATE_INVALID');
        metadata.revalidation = {validUntil:input.validUntil,evidenceAssetId:input.evidenceAssetId,approvedBy:context.actorId,approvedAt:new Date().toISOString()};
      }
      const row = await tx.certificate.update({where:{id},data:{metadata:json(metadata)}});
      await this.appendMutation(tx,id,kind,context.actorId,context.reason,context.correlationId,{evidenceAssetId:input.evidenceAssetId},`Certificate${kind === 'REVALIDATION_APPROVED' ? 'Revalidated' : 'RecipientCorrectionReviewed'}`);
      if(kind === 'REVALIDATION_APPROVED') await this.enqueueRender(tx,id);
      return this.certificate(row);
    });
  }

  public async issue(data: IssueCertificateDto): Promise<CertificateDto> {
    return this.db.$transaction(async (tx: any) => {
      for (const identity of [`event:${data.sourceEventId}`, `completion:${data.sourceCompletionId}`].sort()) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${identity}, 0))`;
      }
      const inbox = await tx.certificateIssuanceInbox.findUnique({ where: { eventId: data.sourceEventId }, include: { certificate: true } });
      if (inbox) {
        if (inbox.payloadHash !== data.sourceEventPayloadHash) throw new Error('CERTIFICATE_SOURCE_EVENT_ID_COLLISION');
        return this.certificate(inbox.certificate);
      }
      const existing = await tx.certificate.findFirst({ where: { sourceCompletionId: data.sourceCompletionId }, orderBy: { issuedAt: 'asc' } });
      if (existing) {
        if (existing.studentReferenceId !== data.studentReferenceId || existing.achievementId !== data.achievementId || existing.sourceEventPayloadHash !== data.sourceEventPayloadHash) throw new Error('CERTIFICATE_SOURCE_COMPLETION_COLLISION');
        return this.certificate(existing);
      }
      await this.assertIssuanceReferences(tx, data);
      const certificate = await tx.certificate.create({ data: this.issueData(data) });
      await tx.certificateIssuanceInbox.create({ data: { eventId: data.sourceEventId, eventType: data.sourceEventType, eventVersion: data.sourceEventVersion, sourceDomain: 'COURSES', payloadHash: data.sourceEventPayloadHash, certificateId: certificate.id } });
      await this.appendMutation(tx, certificate.id, 'ISSUED', data.actorId ?? 'phase14-system', null, data.correlationId, this.certificateIssuedPayload(certificate), 'CertificateIssued');
      if (!certificate.requiresRevalidation) await this.enqueueRender(tx,certificate.id);
      return this.certificate(certificate);
    });
  }

  public async attachArtifacts(data: AttachCertificateArtifactsDto): Promise<CertificateDto> {
    return this.db.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT id FROM "Certificate" WHERE id = ${data.certificateId} FOR UPDATE`;
      const current = await tx.certificate.findUnique({ where: { id: data.certificateId } });
      if (!current) throw new Error('CERTIFICATE_NOT_FOUND');
      if (current.status !== CertificateStatus.ACTIVE) throw new Error('CERTIFICATE_ARTIFACT_STATE_INVALID');
      if (current.expiresAt && new Date(current.expiresAt) <= new Date()) throw new Error('CERTIFICATE_ARTIFACT_STATE_INVALID');
      for (const field of ['certificatePdfAssetId', 'previewImageAssetId', 'verificationQrAssetId'] as const) {
        if (current[field] && data[field] !== undefined && current[field] !== data[field]) throw new Error('CERTIFICATE_ARTIFACT_IMMUTABLE');
      }
      for (const field of ['certificatePdfAssetId', 'previewImageAssetId', 'verificationQrAssetId'] as const) {
        const assetId = data[field];
        if (!assetId) continue;
        await tx.$queryRaw`SELECT id FROM "AssetRecord" WHERE id = ${assetId} FOR SHARE`;
        const asset = await tx.assetRecord.findUnique({where:{id:assetId}});
        if (!asset || asset.lifecycleState !== 'ACTIVE' || asset.ownerType !== 'Certificate' || asset.ownerId !== data.certificateId || (field !== 'verificationQrAssetId' && asset.securityClassification === 'PUBLIC')) throw new Error('CERTIFICATE_ARTIFACT_OWNERSHIP_INVALID');
        if (field === 'certificatePdfAssetId' ? asset.metadata?.mimeType !== 'application/pdf' : !['image/png','image/jpeg','image/svg+xml','image/webp'].includes(asset.metadata?.mimeType)) throw new Error('CERTIFICATE_ARTIFACT_MIME_INVALID');
      }
      const supplied = ['certificatePdfAssetId', 'previewImageAssetId', 'verificationQrAssetId'].filter(field => (data as any)[field] !== undefined);
      if (supplied.length && supplied.every(field => current[field] === (data as any)[field])) return this.certificate(current);
      const row = await tx.certificate.update({
        where: { id: data.certificateId },
        data: {
          ...(data.certificatePdfAssetId !== undefined ? { certificatePdfAssetId: data.certificatePdfAssetId } : {}),
          ...(data.previewImageAssetId !== undefined ? { previewImageAssetId: data.previewImageAssetId } : {}),
          ...(data.verificationQrAssetId !== undefined ? { verificationQrAssetId: data.verificationQrAssetId } : {}),
          ...(data.renderMetadata !== undefined ? {
            metadata: json({
              ...((current.metadata && typeof current.metadata === 'object' && !Array.isArray(current.metadata)) ? current.metadata : {}),
              artifactState: ['certificatePdfAssetId', 'previewImageAssetId', 'verificationQrAssetId'].every(field => (data as any)[field] ?? current[field]) ? 'RENDERED' : 'PARTIAL',
              render: data.renderMetadata ?? null,
            }),
          } : {}),
        },
      });
      await this.appendMutation(tx, row.id, 'ARTIFACTS_ATTACHED', data.actorId, null, data.correlationId, {
        studentReferenceId: row.studentReferenceId,
        certificateId: row.id,
        certificatePdfAssetId: row.certificatePdfAssetId ?? null,
        previewImageAssetId: row.previewImageAssetId ?? null,
        verificationQrAssetId: row.verificationQrAssetId ?? null,
        renderMetadata: data.renderMetadata ?? null,
      }, 'CertificateArtifactsRendered');
      return this.certificate(row);
    });
  }

  public async findById(id: string): Promise<CertificateDto | null> {
    const row = await this.db.certificate.findUnique({ where: { id } });
    return row ? this.certificate(row) : null;
  }
  public async findBySourceEventId(sourceEventId: string): Promise<CertificateDto | null> {
    const row = await this.db.certificate.findUnique({ where: { sourceEventId } });
    return row ? this.certificate(row) : null;
  }
  public async findBySourceCompletionId(sourceCompletionId: string): Promise<CertificateDto | null> {
    const row = await this.db.certificate.findFirst({ where: { sourceCompletionId }, orderBy: { issuedAt: 'asc' } });
    return row ? this.certificate(row) : null;
  }
  public async findByCourseCompletionId(courseCompletionId: string): Promise<CertificateDto | null> {
    const row = await this.db.certificate.findFirst({ where: { courseCompletionId }, orderBy: { issuedAt: 'asc' } });
    return row ? this.certificate(row) : null;
  }
  public async findByLearningPathCompletionId(learningPathCompletionId: string): Promise<CertificateDto | null> {
    const row = await this.db.certificate.findFirst({ where: { learningPathCompletionId }, orderBy: { issuedAt: 'asc' } });
    return row ? this.certificate(row) : null;
  }
  public async findByVerificationCode(verificationCode: string): Promise<CertificateDto | null> {
    const row = await this.db.certificate.findUnique({ where: { verificationCode } });
    return row ? this.certificate(row) : null;
  }
  public async findBySerialNumber(serialNumber: string): Promise<CertificateDto | null> {
    const row = await this.db.certificate.findUnique({ where: { serialNumber } });
    return row ? this.certificate(row) : null;
  }
  public async findForStudent(id: string, studentReferenceId: string): Promise<CertificateDto | null> {
    const row = await this.db.certificate.findFirst({ where: { id, studentReferenceId } });
    return row ? this.certificate(row) : null;
  }
  public async listByStudent(studentReferenceId: string, page = 1, pageSize = 50, cursor?:string): Promise<CertificateDto[]> {
    if(cursor) {
      if(page !== 1 || !Number.isInteger(pageSize) || pageSize<1 || pageSize>100) throw new Error('CERTIFICATE_QUERY_INVALID');
      const anchor=await this.db.certificate.findFirst({where:{id:cursor,studentReferenceId},select:{id:true,issuedAt:true}});
      if(!anchor) throw new Error('CERTIFICATE_CURSOR_INVALID');
      return (await this.db.certificate.findMany({where:{studentReferenceId,OR:[{issuedAt:{lt:anchor.issuedAt}},{issuedAt:anchor.issuedAt,id:{lt:anchor.id}}]},orderBy:[{issuedAt:'desc'},{id:'desc'}],take:pageSize})).map((row:any)=>this.certificate(row));
    }
    const result = await this.list({ studentReferenceId, page, pageSize });
    return result.data;
  }

  public async list(query: CertificateListQuery): Promise<CertificateListResult> {
    if (!Number.isInteger(query.page ?? 1) || (query.page ?? 1) < 1 || (query.page ?? 1) > 100000 || !Number.isInteger(query.pageSize ?? 25) || (query.pageSize ?? 25) < 1 || (query.pageSize ?? 25) > 100) throw new Error('CERTIFICATE_QUERY_INVALID');
    const page = query.page ?? 1;
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    const search = query.search?.trim();
    const where: any = {
      ...(query.issuerId ? { issuerId: query.issuerId } : {}),
      ...(query.studentReferenceId ? { studentReferenceId: query.studentReferenceId } : {}),
      ...(query.templateVersionId ? { templateVersionId: query.templateVersionId } : {}),
      ...(query.issuedFrom || query.issuedTo ? { issuedAt: { ...(query.issuedFrom ? { gte: new Date(query.issuedFrom) } : {}), ...(query.issuedTo ? { lte: new Date(query.issuedTo) } : {}) } } : {}),
      ...(query.status === CertificateStatus.EXPIRED ? { OR: [{ status: CertificateStatus.EXPIRED }, { status: CertificateStatus.ACTIVE, expiresAt: {lte:new Date()} }] } : query.status === CertificateStatus.ACTIVE ? {status:CertificateStatus.ACTIVE, OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]} : query.status ? {status:query.status} : {}),
      ...(query.templateId ? { templateId: query.templateId } : {}),
      ...(search ? { AND: [{ OR: [
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { verificationCode: { contains: search, mode: 'insensitive' } },
        { recipientDisplayName: { contains: search, mode: 'insensitive' } },
        { studentReferenceId: { contains: search, mode: 'insensitive' } },
        { achievementDisplayName: { contains: search, mode: 'insensitive' } },
      ] }] } : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.certificate.findMany({ where, orderBy: [{ issuedAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
      this.db.certificate.count({ where }),
    ]);
    return { data: rows.map((row: any) => this.certificate(row)), total, page, pageSize };
  }

  public async analytics(): Promise<CertificateAnalyticsDto> {
    const soon = new Date(Date.now() + 30 * 86400000);
    const [total, active, revoked, archived, expiringSoon, templates, verifications] = await Promise.all([
      this.db.certificate.count(),
      this.db.certificate.count({ where: { status: CertificateStatus.ACTIVE } }),
      this.db.certificate.count({ where: { status: CertificateStatus.REVOKED } }),
      this.db.certificate.count({ where: { status: CertificateStatus.ARCHIVED } }),
      this.db.certificate.count({ where: { status: CertificateStatus.ACTIVE, expiresAt: { lte: soon, gte: new Date() } } }),
      this.db.certificateTemplate.count({ where: { status: CertificateTemplateStatus.ACTIVE } }),
      this.db.certificateVerificationLog.count(),
    ]);
    return { total, active, revoked, archived, expiringSoon, templates, verifications };
  }

  public async revoke(data: RevokeCertificateDto): Promise<CertificateDto> {
    return this.db.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT id FROM "Certificate" WHERE id = ${data.certificateId} FOR UPDATE`;
      const current = await tx.certificate.findUnique({ where: { id: data.certificateId } });
      if (!current) throw new Error('CERTIFICATE_NOT_FOUND');
      if (current.status === CertificateStatus.REVOKED) return this.certificate(current);
      if (current.status === CertificateStatus.ARCHIVED) throw new Error('CERTIFICATE_ARCHIVED');
      const row = await tx.certificate.update({ where: { id: data.certificateId }, data: { status: CertificateStatus.REVOKED, revokedAt: new Date(), revocationReason: data.reason, revokedBy: data.actorId } });
      await this.appendMutation(tx, row.id, 'REVOKED', data.actorId, data.reason, data.correlationId, { certificateId: row.id, studentReferenceId: row.studentReferenceId, publicId: row.publicId, serialNumber: row.serialNumber, verificationCode: row.verificationCode, status: CertificateStatus.REVOKED, courseDisplayName: row.courseDisplayName, learningPathDisplayName: row.learningPathDisplayName, issuedAt: row.issuedAt?.toISOString?.() ?? row.issuedAt, revokedAt: row.revokedAt?.toISOString?.() ?? row.revokedAt, reason: data.reason }, 'CertificateRevoked');
      return this.certificate(row);
    });
  }

  public async reissue(data: ReissueCertificateDto & { replacement: IssueCertificateDto; eventType?: 'CertificateReissued' | 'CertificateRenewed' }): Promise<CertificateDto> {
    return this.db.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT id FROM "Certificate" WHERE id = ${data.certificateId} FOR UPDATE`;
      const original = await tx.certificate.findUnique({ where: { id: data.certificateId } });
      if (!original) throw new Error('CERTIFICATE_NOT_FOUND');
      const replacementRequest = { actorId: data.actorId, reason: data.reason, eventType: data.eventType ?? 'CertificateReissued', templateId: data.replacement.templateId, templateVersionId:data.replacement.templateVersionId, recipientDisplayName: data.replacement.recipientDisplayName ?? null };
      if (original.replacedByCertificateId) {
        const existing = await tx.certificate.findUnique({ where: { id: original.replacedByCertificateId } });
        if (!existing || JSON.stringify(existing.metadata?.replacementRequest) !== JSON.stringify(replacementRequest)) throw new Error('CERTIFICATE_REPLACEMENT_REQUEST_CONFLICT');
        return this.certificate(existing);
      }
      if ((data.replacement.recipientDisplayName ?? null) !== (original.recipientDisplayName ?? null)) {
        const correction = original.metadata?.recipientCorrection;
        if (correction?.state !== 'APPROVED' || correction.name !== data.replacement.recipientDisplayName || !correction.approvedBy || correction.approvedBy === correction.createdBy) throw new Error('CERTIFICATE_RECIPIENT_CORRECTION_APPROVAL_REQUIRED');
      }
      data.replacement = { ...data.replacement, metadata: { ...data.replacement.metadata, replacementRequest, recipientCorrection: original.metadata?.recipientCorrection ?? null } };
      if (data.eventType !== 'CertificateRenewed' && original.status !== CertificateStatus.REVOKED) throw new Error('CERTIFICATE_MUST_BE_REVOKED_BEFORE_REISSUE');
      if (data.eventType === 'CertificateRenewed' && ![CertificateStatus.ACTIVE, CertificateStatus.EXPIRED].includes(original.status)) throw new Error('CERTIFICATE_RENEWAL_STATE_INVALID');
      await this.assertIssuanceReferences(tx, data.replacement);
      const replacement = await tx.certificate.create({ data: { ...this.issueData(data.replacement), replacesCertificateId: original.id, revokedAt: null, revocationReason: null, revokedBy: null, archivedAt: null, replacedByCertificateId: null } });
      await tx.certificate.update({ where: { id: original.id }, data: { status: CertificateStatus.REISSUED, replacedByCertificateId: replacement.id } });
      const eventType = data.eventType ?? 'CertificateReissued';
      const eventPayload = eventType === 'CertificateRenewed'
        ? { certificateId: replacement.id, certificateNumber: replacement.serialNumber, studentReferenceId: replacement.studentReferenceId, renewedAt: replacement.issuedAt?.toISOString?.() ?? replacement.issuedAt, newExpirationDate: replacement.expiresAt?.toISOString?.() ?? replacement.expiresAt }
        : { certificateId: replacement.id, studentReferenceId: replacement.studentReferenceId, reasonCode: data.reason, replacesCertificateId: original.id, publicId: replacement.publicId, serialNumber: replacement.serialNumber, verificationCode: replacement.verificationCode, status: replacement.status, courseDisplayName: replacement.courseDisplayName, learningPathDisplayName: replacement.learningPathDisplayName, issuedAt: replacement.issuedAt?.toISOString?.() ?? replacement.issuedAt, expiresAt: replacement.expiresAt?.toISOString?.() ?? replacement.expiresAt ?? null };
      await this.appendMutation(tx, replacement.id, eventType === 'CertificateRenewed' ? 'RENEWED' : 'REISSUED', data.actorId, data.reason, data.correlationId, eventPayload, eventType);
      if(!replacement.requiresRevalidation) await this.enqueueRender(tx,replacement.id);
      return this.certificate(replacement);
    });
  }

  public async expireDue(asOf: Date, actorId: string, correlationId?: string | null): Promise<number> {
    return this.db.$transaction(async (tx: any) => {
      const selected = await tx.$queryRaw`SELECT id FROM "Certificate" WHERE status = 'ACTIVE' AND "validityPolicy" IN ('EXPIRING','RENEWABLE') AND "expiresAt" <= ${asOf} ORDER BY "expiresAt", id LIMIT 100 FOR UPDATE SKIP LOCKED`;
      const due = selected.length ? await tx.certificate.findMany({where:{id:{in:selected.map((row: {id:string})=>row.id)}}}) : [];
      const oldLogs = await tx.certificateVerificationLog.findMany({where:{occurredAt:{lt:new Date(asOf.getTime()-30*86400000)}},select:{id:true},take:100,orderBy:{occurredAt:'asc'}});
      if(oldLogs.length) await tx.certificateVerificationLog.deleteMany({where:{id:{in:oldLogs.map((row:{id:string})=>row.id)}}});

      let count = 0;
      for (const current of due) {
        const changed = await tx.certificate.updateMany({ where: { id: current.id, status: CertificateStatus.ACTIVE }, data: { status: CertificateStatus.EXPIRED } });
        if (!changed.count) continue;
        count += 1;
        await this.appendMutation(tx, current.id, 'EXPIRED', actorId, 'VALIDITY_WINDOW_ENDED', correlationId, { certificateId: current.id, studentReferenceId: current.studentReferenceId, certificateNumber: current.serialNumber, status: 'EXPIRED', expiredAt: current.expiresAt?.toISOString?.() ?? current.expiresAt }, 'CertificateExpired');
      }
      return count;
    });
  }

  public async archive(certificateId: string, actorId: string, reason: string, correlationId?: string | null): Promise<CertificateDto> {
    return this.db.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT id FROM "Certificate" WHERE id = ${certificateId} FOR UPDATE`;
      const current = await tx.certificate.findUnique({ where: { id: certificateId } });
      if (!current) throw new Error('CERTIFICATE_NOT_FOUND');
      if (current.status === CertificateStatus.ARCHIVED) return this.certificate(current);
      const row = await tx.certificate.update({ where: { id: certificateId }, data: { status: CertificateStatus.ARCHIVED, archivedAt: new Date() } });
      await this.appendMutation(tx, row.id, 'ARCHIVED', actorId, reason, correlationId, {}, 'CertificateArchived');
      return this.certificate(row);
    });
  }

  public async recordVerification(certificateId: string, result: string, channel: string): Promise<void> {
    await this.db.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`verify:${certificateId}`}, 0))`;
      const recent = await tx.certificateVerificationLog.findFirst({where:{certificateId, result, occurredAt:{gte:new Date(Date.now()-60000)}}});
      if (recent) return;
      await tx.certificateVerificationLog.create({ data: { certificateId, result, channel } });
      await tx.transactionalOutboxRecord.create({ data: this.outbox(certificateId, 'CertificateVerified', { certificateId, verifierId: 'public-anonymous', verificationStatus: result, channel }, null, 'Certificate') });
    });
  }

  public async listLedger(certificateId: string, page = 1, cursor?:string): Promise<CertificateLedgerEntryDto[]> {
    if (!Number.isInteger(page) || page < 1 || page > 100000) throw new Error('CERTIFICATE_QUERY_INVALID');
    let where:any={certificateId};
    if(cursor){
      if(page !== 1) throw new Error('CERTIFICATE_QUERY_INVALID');
      const anchor=await this.db.certificateLedgerEntry.findFirst({where:{id:cursor,certificateId},select:{id:true,occurredAt:true}});
      if(!anchor) throw new Error('CERTIFICATE_CURSOR_INVALID');
      where={certificateId,OR:[{occurredAt:{lt:anchor.occurredAt}},{occurredAt:anchor.occurredAt,id:{lt:anchor.id}}]};
    }
    return (await this.db.certificateLedgerEntry.findMany({ where, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], take: 50, skip: (page - 1) * 50 })).map((row: any) => ({ ...row, payload: row.payload as Record<string, unknown> | null }));
  }

  private async assertIssuanceReferences(tx: any, data: IssueCertificateDto): Promise<void> {
    await tx.$queryRaw`SELECT id FROM "CertificateTemplate" WHERE id = ${data.templateId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "CertificateIssuer" WHERE id = ${data.issuerId} FOR UPDATE`;
    const [template, version, issuer] = await Promise.all([
      tx.certificateTemplate.findUnique({ where: { id: data.templateId } }),
      tx.certificateTemplateVersion.findUnique({ where: { id: data.templateVersionId } }),
      tx.certificateIssuer.findUnique({ where: { id: data.issuerId } }),
    ]);
    if (!template || template.status !== CertificateTemplateStatus.ACTIVE) throw new Error('ACTIVE_CERTIFICATE_TEMPLATE_REQUIRED');
    if (!version || version.templateId !== template.id || template.currentVersionId !== version.id || version.versionNumber !== data.templateVersion || version.status !== CertificateTemplateStatus.ACTIVE) throw new Error('ACTIVE_CERTIFICATE_TEMPLATE_VERSION_REQUIRED');
    if (!issuer || issuer.status !== 'ACTIVE' || (issuer.issuerType !== 'MANARATAK' && !issuer.metadata?.trust?.approvedBy) || version.issuerId !== issuer.id || template.issuerId !== issuer.id) throw new Error('ACTIVE_ACCREDITED_CERTIFICATE_ISSUER_REQUIRED');
    if (issuer.signingKeyReference !== data.signingKeyReference) throw new Error('CERTIFICATE_ISSUER_SIGNING_KEY_MISMATCH');
    await this.assertFrozenVisualAssets(tx, version);
  }

  private issueData(data: IssueCertificateDto): any {
    const { correlationId: _correlationId, actorId: _actorId, skills, competencies, metadata, ...rest } = data;
    return { ...rest, issuedAt: data.issuedAt ?? new Date(), skills: json(skills ?? []), competencies: json(competencies ?? []), metadata: json(metadata) };
  }

  private certificateIssuedPayload(certificate: any): Record<string, unknown> {
    return {
      schemaVersion: '2.0',
      studentReferenceId: certificate.studentReferenceId,
      certificateId: certificate.id,
      publicId: certificate.publicId,
      certificateNumber: certificate.serialNumber,
      serialNumber: certificate.serialNumber,
      verificationCode: certificate.verificationCode,
      verificationUrl: certificate.verificationUrl,
      status: certificate.status,
      certificateType: certificate.certificateType,
      courseId: certificate.courseId ?? null,
      learningPathId: certificate.learningPathId ?? null,
      courseDisplayName: certificate.courseDisplayName ?? null,
      learningPathDisplayName: certificate.learningPathDisplayName ?? null,
      issuedAt: certificate.issuedAt?.toISOString?.() ?? certificate.issuedAt,
      expiresAt: certificate.expiresAt?.toISOString?.() ?? certificate.expiresAt ?? null,
      certificatePdfAssetId: certificate.certificatePdfAssetId ?? null,
      previewImageAssetId: certificate.previewImageAssetId ?? null,
    };
  }

  private async enqueueRender(tx:any,certificateId:string):Promise<void> {
    await tx.transactionalOutboxRecord.create({data:this.outbox(certificateId,'CertificateRenderRequested',{certificateId},null,'Certificate')});
  }

  private async appendMutation(tx: any, certificateId: string, action: string, actorId: string, reason: string | null, correlationId: string | null | undefined, payload: Record<string, unknown>, eventType: string): Promise<void> {
    const now = new Date();
    const auditId = randomUUID();
    await tx.certificateLedgerEntry.create({ data: { certificateId, action, actorId, reason, payload: json(payload), occurredAt: now } });
    await tx.auditRecord.create({ data: { id: auditId, reference: `cert-audit-${auditId}`, action, category: 'CERTIFICATES', severity: action === 'REVOKED' ? 'HIGH' : 'INFO', actorId, actorType: actorId === 'phase14-system' ? 'SYSTEM' : 'USER', targetId: certificateId, targetType: 'Certificate', source: 'Phase14', timestamp: now, contextMetadata: json({ reason, ...payload })!, correlationReference: correlationId ?? null } });
    await tx.transactionalOutboxRecord.create({ data: this.outbox(certificateId, eventType, payload, correlationId, 'Certificate') });
  }

  private async appendGovernanceMutation(tx: any, targetType: string, targetId: string, action: string, context: CertificateMutationContext, payload: Record<string, unknown>, eventType: string): Promise<void> {
    const now = new Date();
    const auditId = randomUUID();
    await tx.auditRecord.create({ data: { id: auditId, reference: `cert-governance-${auditId}`, action, category: 'CERTIFICATE_GOVERNANCE', severity: 'INFO', actorId: context.actorId, actorType: context.actorId === 'phase14-system' ? 'SYSTEM' : 'USER', targetId, targetType, source: 'Phase14', timestamp: now, contextMetadata: json({ reason: context.reason ?? null, ...payload })!, correlationReference: context.correlationId ?? null } });
    await tx.transactionalOutboxRecord.create({ data: this.outbox(targetId, eventType, { targetId, action, actorId: context.actorId, ...payload }, context.correlationId, targetType) });
  }

  private outbox(aggregateId: string, eventType: string, payload: Record<string, unknown>, correlationId: string | null | undefined, aggregateType: string): any {
    const id = randomUUID();
    return { id, eventType, domain: 'CERTIFICATES', aggregateType, aggregateId, payload: json(payload), metadata: json({ sourcePhase: 'Phase14', schemaVersion: eventType === 'CertificateIssued' ? '2.0' : '1.0' }), correlationId: correlationId ?? null };
  }

  private templateVersionCreateData(templateId: string, versionNumber: string, status: CertificateTemplateStatus, data: CreateCertificateTemplateDto | (UpdateCertificateTemplateDto & { issuerId: string }), createdBy: string): any {
    return {
      publicId: `cert-template-version-${randomUUID()}`,
      templateId,
      issuerId: data.issuerId,
      versionNumber,
      status,
      language: data.language,
      layout: data.layout,
      accentColor: data.accentColor,
      secondaryColor: data.secondaryColor,
      titleAr: data.titleAr,
      titleEn: data.titleEn,
      bodyAr: data.bodyAr,
      bodyEn: data.bodyEn,
      signatoryNameAr: data.signatoryNameAr,
      signatoryNameEn: data.signatoryNameEn,
      signatoryTitleAr: data.signatoryTitleAr,
      signatoryTitleEn: data.signatoryTitleEn,
      logoAssetId: data.logoAssetId,
      sealAssetId: data.sealAssetId,
      signatureAssetId: data.signatureAssetId,
      designAssetId: data.designAssetId,
      validityPolicy: data.validityPolicy ?? 'PERMANENT',
      validityDurationDays: data.validityDurationDays,
      renewalPeriodDays: data.renewalPeriodDays,
      renewalPolicy: data.renewalPolicy,
      requiresRevalidation: data.requiresRevalidation ?? false,
      metadata: json(data.metadata),
      createdBy,
    };
  }

  private mergeTemplateVersion(current: any, data: UpdateCertificateTemplateDto, issuerId: string): UpdateCertificateTemplateDto & { issuerId: string } {
    return {
      issuerId,
      language: data.language ?? current.language,
      layout: data.layout ?? current.layout,
      accentColor: data.accentColor ?? current.accentColor,
      secondaryColor: data.secondaryColor ?? current.secondaryColor,
      titleAr: data.titleAr ?? current.titleAr,
      titleEn: data.titleEn ?? current.titleEn,
      bodyAr: data.bodyAr ?? current.bodyAr,
      bodyEn: data.bodyEn ?? current.bodyEn,
      signatoryNameAr: data.signatoryNameAr !== undefined ? data.signatoryNameAr : current.signatoryNameAr,
      signatoryNameEn: data.signatoryNameEn !== undefined ? data.signatoryNameEn : current.signatoryNameEn,
      signatoryTitleAr: data.signatoryTitleAr !== undefined ? data.signatoryTitleAr : current.signatoryTitleAr,
      signatoryTitleEn: data.signatoryTitleEn !== undefined ? data.signatoryTitleEn : current.signatoryTitleEn,
      logoAssetId: data.logoAssetId !== undefined ? data.logoAssetId : current.logoAssetId,
      sealAssetId: data.sealAssetId !== undefined ? data.sealAssetId : current.sealAssetId,
      signatureAssetId: data.signatureAssetId !== undefined ? data.signatureAssetId : current.signatureAssetId,
      designAssetId: data.designAssetId !== undefined ? data.designAssetId : current.designAssetId,
      validityPolicy: data.validityPolicy ?? current.validityPolicy,
      validityDurationDays: data.validityDurationDays !== undefined ? data.validityDurationDays : current.validityDurationDays,
      renewalPeriodDays: data.renewalPeriodDays !== undefined ? data.renewalPeriodDays : current.renewalPeriodDays,
      renewalPolicy: data.renewalPolicy !== undefined ? data.renewalPolicy : current.renewalPolicy,
      requiresRevalidation: data.requiresRevalidation ?? current.requiresRevalidation,
      metadata: data.metadata !== undefined ? data.metadata : current.metadata,
    };
  }

  private async assertFrozenVisualAssets(tx:any,version:any):Promise<void> {
    const ids = [...new Set([version.logoAssetId,version.sealAssetId,version.signatureAssetId,version.designAssetId].filter(Boolean))].sort();
    for(const id of ids) {
      await tx.$queryRaw`SELECT id FROM "AssetRecord" WHERE id = ${id} FOR SHARE`;
      const asset = await tx.assetRecord.findUnique({where:{id}});
      if(!asset || asset.lifecycleState !== 'ACTIVE' || !['image/png','image/jpeg'].includes(asset.metadata?.mimeType) || asset.checksumAlgorithm?.toLowerCase().replace('-','') !== 'sha256' || !asset.checksumHash || asset.checksumHash !== version.metadata?.assetProvenance?.[id]) throw new Error('CERTIFICATE_TEMPLATE_ASSET_PROVENANCE_CHANGED');
    }
  }

  private async requireActiveIssuer(tx: any, issuerId: string): Promise<any> {
    await tx.$queryRaw`SELECT id FROM "CertificateIssuer" WHERE id = ${issuerId} FOR UPDATE`;
    const issuer = await tx.certificateIssuer.findUnique({ where: { id: issuerId } });
    if (!issuer || issuer.status !== 'ACTIVE' || (issuer.issuerType !== 'MANARATAK' && !issuer.metadata?.trust?.approvedBy)) throw new Error('ACTIVE_ACCREDITED_CERTIFICATE_ISSUER_REQUIRED');
    if (!issuer.issuerLogoAssetId || !issuer.signingKeyReference) throw new Error('CERTIFICATE_ISSUER_AUTHORITY_INCOMPLETE');
    return issuer;
  }

  private bumpPatch(version: string): string {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/u);
    if (!match) throw new Error('CERTIFICATE_TEMPLATE_VERSION_INVALID');
    return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
  }

  private issuer(row: any): CertificateIssuerDto {
    return { ...row, status: row.status as CertificateIssuerStatus, metadata: row.metadata as Record<string, unknown> | null };
  }

  private template(row: any): CertificateTemplateDto {
    const version = row.currentVersion;
    if (!version) throw new Error('CERTIFICATE_TEMPLATE_CURRENT_VERSION_REQUIRED');
    const issuer = row.issuer;
    return {
      id: row.id,
      publicId: row.publicId,
      code: row.code,
      name: row.name,
      nameAr: row.nameAr,
      nameEn: row.nameEn,
      status: row.status as CertificateTemplateStatus,
      currentVersionId: version.id,
      templateVersion: version.versionNumber,
      issuerId: version.issuerId,
      issuerName: issuer?.name ?? null,
      issuerReferenceId: issuer?.publicId ?? null,
      language: version.language,
      layout: version.layout,
      accentColor: version.accentColor,
      secondaryColor: version.secondaryColor,
      titleAr: version.titleAr,
      titleEn: version.titleEn,
      bodyAr: version.bodyAr,
      bodyEn: version.bodyEn,
      signatoryNameAr: version.signatoryNameAr,
      signatoryNameEn: version.signatoryNameEn,
      signatoryTitleAr: version.signatoryTitleAr,
      signatoryTitleEn: version.signatoryTitleEn,
      logoAssetId: version.logoAssetId,
      sealAssetId: version.sealAssetId,
      signatureAssetId: version.signatureAssetId,
      designAssetId: version.designAssetId,
      validityPolicy: version.validityPolicy,
      validityDurationDays: version.validityDurationDays,
      renewalPeriodDays: version.renewalPeriodDays,
      renewalPolicy: version.renewalPolicy,
      requiresRevalidation: version.requiresRevalidation,
      metadata: version.metadata as Record<string, unknown> | null,
      currentVersion: {
        id: version.id,
        publicId: version.publicId,
        templateId: version.templateId,
        issuerId: version.issuerId,
        versionNumber: version.versionNumber,
        status: version.status as CertificateTemplateStatus,
        language: version.language,
        layout: version.layout,
        accentColor: version.accentColor,
        secondaryColor: version.secondaryColor,
        titleAr: version.titleAr,
        titleEn: version.titleEn,
        bodyAr: version.bodyAr,
        bodyEn: version.bodyEn,
        signatoryNameAr: version.signatoryNameAr,
        signatoryNameEn: version.signatoryNameEn,
        signatoryTitleAr: version.signatoryTitleAr,
        signatoryTitleEn: version.signatoryTitleEn,
        logoAssetId: version.logoAssetId,
        sealAssetId: version.sealAssetId,
        signatureAssetId: version.signatureAssetId,
        designAssetId: version.designAssetId,
        validityPolicy: version.validityPolicy,
        validityDurationDays: version.validityDurationDays,
        renewalPeriodDays: version.renewalPeriodDays,
        renewalPolicy: version.renewalPolicy,
        requiresRevalidation: version.requiresRevalidation,
        metadata: version.metadata as Record<string, unknown> | null,
        createdBy: version.createdBy,
        approvedBy: version.approvedBy,
        approvedAt: version.approvedAt,
        createdAt: version.createdAt,
      },
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private templateVersion(row: any): CertificateTemplateVersionDto {
    return {
      id: row.id, publicId: row.publicId, templateId: row.templateId, issuerId: row.issuerId,
      versionNumber: row.versionNumber, status: row.status as CertificateTemplateStatus,
      language: row.language, layout: row.layout, accentColor: row.accentColor, secondaryColor: row.secondaryColor,
      titleAr: row.titleAr, titleEn: row.titleEn, bodyAr: row.bodyAr, bodyEn: row.bodyEn,
      signatoryNameAr: row.signatoryNameAr, signatoryNameEn: row.signatoryNameEn,
      signatoryTitleAr: row.signatoryTitleAr, signatoryTitleEn: row.signatoryTitleEn,
      logoAssetId: row.logoAssetId, sealAssetId: row.sealAssetId, signatureAssetId: row.signatureAssetId, designAssetId: row.designAssetId,
      validityPolicy: row.validityPolicy, validityDurationDays: row.validityDurationDays, renewalPeriodDays: row.renewalPeriodDays,
      renewalPolicy: row.renewalPolicy, requiresRevalidation: row.requiresRevalidation,
      metadata: row.metadata as Record<string, unknown> | null, createdBy: row.createdBy, approvedBy: row.approvedBy,
      approvedAt: row.approvedAt, createdAt: row.createdAt,
    };
  }

  private certificate(row: any): CertificateDto {
    return { ...row, status: row.status as CertificateStatus, skills: Array.isArray(row.skills) ? row.skills : [], competencies: Array.isArray(row.competencies) ? row.competencies : [], metadata: row.metadata as Record<string, unknown> } as CertificateDto;
  }
}
