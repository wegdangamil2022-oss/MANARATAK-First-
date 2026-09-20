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
      const issuer = await tx.certificateIssuer.create({ data: { ...data, metadata: json(data.metadata) } });
      await this.appendGovernanceMutation(tx, 'CertificateIssuer', issuer.id, 'CERTIFICATE_ISSUER_CREATED', context, { issuerCode: issuer.code }, 'CertificateIssuerCreated');
      return this.issuer(issuer);
    });
  }

  public async updateIssuer(id: string, data: UpdateCertificateIssuerDto, context: CertificateMutationContext): Promise<CertificateIssuerDto> {
    return this.db.$transaction(async (tx: any) => {
      const current = await tx.certificateIssuer.findUnique({ where: { id } });
      if (!current) throw new Error('CERTIFICATE_ISSUER_NOT_FOUND');
      if (data.signingKeyReference && data.signingKeyReference !== current.signingKeyReference && current.status === 'ACTIVE') {
        throw new Error('CERTIFICATE_ISSUER_SIGNING_KEY_CHANGE_REQUIRES_SUSPENSION');
      }
      const issuer = await tx.certificateIssuer.update({ where: { id }, data: { ...data, metadata: data.metadata === undefined ? undefined : json(data.metadata) } });
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
      const current = await tx.certificateTemplate.findUnique({ where: { id }, include: this.templateInclude });
      if (!current) throw new Error('CERTIFICATE_TEMPLATE_NOT_FOUND');
      if (current.status !== CertificateTemplateStatus.DRAFT) throw new Error('CERTIFICATE_TEMPLATE_IMMUTABLE');
      if (!current.currentVersion) throw new Error('CERTIFICATE_TEMPLATE_CURRENT_VERSION_REQUIRED');
      const issuerId = data.issuerId ?? current.currentVersion.issuerId ?? current.issuerId;
      await this.requireActiveIssuer(tx, issuerId);
      const versionNumber = data.templateVersion ?? this.bumpPatch(current.currentVersion.versionNumber);
      if (versionNumber === current.currentVersion.versionNumber) throw new Error('CERTIFICATE_TEMPLATE_VERSION_MUST_ADVANCE');
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
      const current = await tx.certificateTemplate.findUnique({ where: { id }, include: this.templateInclude });
      if (!current) throw new Error('CERTIFICATE_TEMPLATE_NOT_FOUND');
      if (!current.currentVersion) throw new Error('CERTIFICATE_TEMPLATE_CURRENT_VERSION_REQUIRED');
      const currentStatus = current.status as CertificateTemplateStatus;
      if (!templateTransitions[currentStatus].includes(status)) throw new Error('CERTIFICATE_TEMPLATE_TRANSITION_INVALID');
      if (status === CertificateTemplateStatus.APPROVED && current.currentVersion.createdBy === context.actorId) {
        throw new Error('CERTIFICATE_TEMPLATE_MAKER_CHECKER_REQUIRED');
      }
      if (status === CertificateTemplateStatus.ACTIVE) {
        if (!current.currentVersion.approvedBy) throw new Error('CERTIFICATE_TEMPLATE_APPROVAL_REQUIRED');
        await this.requireActiveIssuer(tx, current.currentVersion.issuerId);
      }
      const versionUpdate: Record<string, unknown> = { status };
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
    const row = await this.db.certificateTemplate.findFirst({
      where: { name, status: CertificateTemplateStatus.ACTIVE, issuer: { status: 'ACTIVE' }, currentVersionId: { not: null } },
      orderBy: { updatedAt: 'desc' },
      include: this.templateInclude,
    });
    return row ? this.template(row) : null;
  }

  public async listTemplates(): Promise<CertificateTemplateDto[]> {
    return (await this.db.certificateTemplate.findMany({ orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }], include: this.templateInclude })).map((row: any) => this.template(row));
  }

  public async issue(data: IssueCertificateDto): Promise<CertificateDto> {
    return this.db.$transaction(async (tx: any) => {
      const inbox = await tx.certificateIssuanceInbox.findUnique({ where: { eventId: data.sourceEventId }, include: { certificate: true } });
      if (inbox) {
        if (inbox.payloadHash !== data.sourceEventPayloadHash) throw new Error('CERTIFICATE_SOURCE_EVENT_ID_COLLISION');
        return this.certificate(inbox.certificate);
      }
      const existing = await tx.certificate.findFirst({ where: { sourceCompletionId: data.sourceCompletionId }, orderBy: { issuedAt: 'asc' } });
      if (existing) return this.certificate(existing);
      await this.assertIssuanceReferences(tx, data);
      const certificate = await tx.certificate.create({ data: this.issueData(data) });
      await tx.certificateIssuanceInbox.create({ data: { eventId: data.sourceEventId, eventType: data.sourceEventType, eventVersion: data.sourceEventVersion, sourceDomain: 'COURSES', payloadHash: data.sourceEventPayloadHash, certificateId: certificate.id } });
      await this.appendMutation(tx, certificate.id, 'ISSUED', data.actorId ?? 'phase14-system', null, data.correlationId, this.certificateIssuedPayload(certificate), 'CertificateIssued');
      return this.certificate(certificate);
    });
  }

  public async attachArtifacts(data: AttachCertificateArtifactsDto): Promise<CertificateDto> {
    return this.db.$transaction(async (tx: any) => {
      const current = await tx.certificate.findUnique({ where: { id: data.certificateId } });
      if (!current) throw new Error('CERTIFICATE_NOT_FOUND');
      const row = await tx.certificate.update({
        where: { id: data.certificateId },
        data: {
          ...(data.certificatePdfAssetId !== undefined ? { certificatePdfAssetId: data.certificatePdfAssetId } : {}),
          ...(data.previewImageAssetId !== undefined ? { previewImageAssetId: data.previewImageAssetId } : {}),
          ...(data.verificationQrAssetId !== undefined ? { verificationQrAssetId: data.verificationQrAssetId } : {}),
          ...(data.renderMetadata !== undefined ? {
            metadata: json({
              ...((current.metadata && typeof current.metadata === 'object' && !Array.isArray(current.metadata)) ? current.metadata : {}),
              artifactState: 'RENDERED',
              render: data.renderMetadata ?? null,
            }),
          } : {}),
        },
      });
      await this.appendMutation(tx, row.id, 'ARTIFACTS_ATTACHED', data.actorId, null, data.correlationId, {
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
  public async listByStudent(studentReferenceId: string): Promise<CertificateDto[]> {
    return (await this.db.certificate.findMany({ where: { studentReferenceId }, orderBy: { issuedAt: 'desc' } })).map((row: any) => this.certificate(row));
  }

  public async list(query: CertificateListQuery): Promise<CertificateListResult> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    const search = query.search?.trim();
    const where: any = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.templateId ? { templateId: query.templateId } : {}),
      ...(search ? { OR: [
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { verificationCode: { contains: search, mode: 'insensitive' } },
        { recipientDisplayName: { contains: search, mode: 'insensitive' } },
        { studentReferenceId: { contains: search, mode: 'insensitive' } },
        { achievementDisplayName: { contains: search, mode: 'insensitive' } },
      ] } : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.certificate.findMany({ where, orderBy: { issuedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
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
      const original = await tx.certificate.findUnique({ where: { id: data.certificateId } });
      if (!original) throw new Error('CERTIFICATE_NOT_FOUND');
      if (original.replacedByCertificateId) return this.certificate(await tx.certificate.findUnique({ where: { id: original.replacedByCertificateId } }));
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
      return this.certificate(replacement);
    });
  }

  public async expireDue(asOf: Date, actorId: string, correlationId?: string | null): Promise<number> {
    return this.db.$transaction(async (tx: any) => {
      const due = await tx.certificate.findMany({ where: { status: CertificateStatus.ACTIVE, validityPolicy: { in: ['EXPIRING', 'RENEWABLE'] }, expiresAt: { lte: asOf } } });
      let count = 0;
      for (const current of due) {
        const changed = await tx.certificate.updateMany({ where: { id: current.id, status: CertificateStatus.ACTIVE }, data: { status: CertificateStatus.EXPIRED } });
        if (!changed.count) continue;
        count += 1;
        await this.appendMutation(tx, current.id, 'EXPIRED', actorId, 'VALIDITY_WINDOW_ENDED', correlationId, { certificateId: current.id, certificateNumber: current.serialNumber, expiredAt: current.expiresAt?.toISOString?.() ?? current.expiresAt }, 'CertificateExpired');
      }
      return count;
    });
  }

  public async archive(certificateId: string, actorId: string, reason: string, correlationId?: string | null): Promise<CertificateDto> {
    return this.db.$transaction(async (tx: any) => {
      const current = await tx.certificate.findUnique({ where: { id: certificateId } });
      if (!current) throw new Error('CERTIFICATE_NOT_FOUND');
      const row = await tx.certificate.update({ where: { id: certificateId }, data: { status: CertificateStatus.ARCHIVED, archivedAt: new Date() } });
      await this.appendMutation(tx, row.id, 'ARCHIVED', actorId, reason, correlationId, {}, 'CertificateArchived');
      return this.certificate(row);
    });
  }

  public async recordVerification(certificateId: string, result: string, channel: string): Promise<void> {
    await this.db.$transaction(async (tx: any) => {
      await tx.certificateVerificationLog.create({ data: { certificateId, result, channel } });
      await tx.transactionalOutboxRecord.create({ data: this.outbox(certificateId, 'CertificateVerified', { certificateId, verifierId: 'public-anonymous', verificationStatus: result, channel }, null, 'Certificate') });
    });
  }

  public async listLedger(certificateId: string): Promise<CertificateLedgerEntryDto[]> {
    return (await this.db.certificateLedgerEntry.findMany({ where: { certificateId }, orderBy: { occurredAt: 'desc' } })).map((row: any) => ({ ...row, payload: row.payload as Record<string, unknown> | null }));
  }

  private async assertIssuanceReferences(tx: any, data: IssueCertificateDto): Promise<void> {
    const [template, version, issuer] = await Promise.all([
      tx.certificateTemplate.findUnique({ where: { id: data.templateId } }),
      tx.certificateTemplateVersion.findUnique({ where: { id: data.templateVersionId } }),
      tx.certificateIssuer.findUnique({ where: { id: data.issuerId } }),
    ]);
    if (!template || template.status !== CertificateTemplateStatus.ACTIVE) throw new Error('ACTIVE_CERTIFICATE_TEMPLATE_REQUIRED');
    if (!version || version.templateId !== template.id || version.status !== CertificateTemplateStatus.ACTIVE) throw new Error('ACTIVE_CERTIFICATE_TEMPLATE_VERSION_REQUIRED');
    if (!issuer || issuer.status !== 'ACTIVE' || version.issuerId !== issuer.id || template.issuerId !== issuer.id) throw new Error('ACTIVE_ACCREDITED_CERTIFICATE_ISSUER_REQUIRED');
    if (issuer.signingKeyReference !== data.signingKeyReference) throw new Error('CERTIFICATE_ISSUER_SIGNING_KEY_MISMATCH');
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

  private async requireActiveIssuer(tx: any, issuerId: string): Promise<any> {
    const issuer = await tx.certificateIssuer.findUnique({ where: { id: issuerId } });
    if (!issuer || issuer.status !== 'ACTIVE') throw new Error('ACTIVE_ACCREDITED_CERTIFICATE_ISSUER_REQUIRED');
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
