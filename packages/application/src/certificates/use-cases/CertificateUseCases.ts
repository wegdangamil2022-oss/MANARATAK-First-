import { createHash, randomUUID } from 'crypto';
import {
  AssetId,
  AssetLifecycleState,
  AssetSecurityClassification,
  AttachCertificateArtifactsDto,
  CertificateAuthoritativeEventEnvelope,
  CertificateDto,
  CertificateIssuerStatus,
  CertificateIssuerType,
  CertificateListQuery,
  CertificateMutationContext,
  CertificateSignedEnvelopeV2,
  CertificateStatus,
  CertificateTemplateDto,
  CertificateTemplateStatus,
  CertificateVerificationDto,
  CourseCompletedEventPayload,
  CourseOriginType,
  CreateCertificateIssuerDto,
  IAssetRecordRepository,
  ICertificateRepository,
  ICourseRepository,
  ILearningPathRepository,
  IIdentityRepository,
  LearningPathCompletedEventPayload,
  UpdateCertificateIssuerDto,
  UpdateCertificateTemplateDto,
} from '@manaratak/domain';
import { CertificateSigningRuntimeConfiguration, CertificateTrustPolicy } from '../services/CertificateTrustPolicy';

export type CertificateTemplateAuthoringInput = Omit<
  Parameters<ICertificateRepository['createTemplate']>[0],
  'publicId' | 'status' | 'issuerName' | 'issuerReferenceId'
>;

const templateTransitions: Record<CertificateTemplateStatus, CertificateTemplateStatus[]> = {
  DRAFT: [CertificateTemplateStatus.PENDING_APPROVAL],
  PENDING_APPROVAL: [CertificateTemplateStatus.DRAFT, CertificateTemplateStatus.APPROVED],
  APPROVED: [CertificateTemplateStatus.ACTIVE, CertificateTemplateStatus.DRAFT],
  ACTIVE: [CertificateTemplateStatus.DEPRECATED],
  DEPRECATED: [CertificateTemplateStatus.ARCHIVED],
  ARCHIVED: [],
  RETIRED: [],
};

export class CertificateUseCases {
  private readonly trustPolicy: CertificateTrustPolicy;

  constructor(
    private readonly certificateRepository: ICertificateRepository,
    private readonly courseRepository: ICourseRepository,
    private readonly assetRepository?: IAssetRecordRepository,
    signingRuntime: CertificateSigningRuntimeConfiguration = {},
    private readonly learningPathRepository?: ILearningPathRepository,
    private readonly identityRepository?: IIdentityRepository,
  ) {
    this.trustPolicy = new CertificateTrustPolicy(signingRuntime);
  }

  /**
   * Authoritative Phase 13 integration boundary. There is deliberately no HTTP
   * endpoint that accepts completion facts and calls this method directly.
   */
  public async consumeCompletionEvent(
    event: CertificateAuthoritativeEventEnvelope<CourseCompletedEventPayload | LearningPathCompletedEventPayload>,
  ): Promise<CertificateDto> {
    this.assertAuthoritativeCompletionEnvelope(event);
    const repeated = await this.certificateRepository.findBySourceEventId(event.eventId);
    if (repeated) return repeated;
    return event.eventType === 'CourseCompleted'
      ? this.issueCourseCompletion(event as CertificateAuthoritativeEventEnvelope<CourseCompletedEventPayload>)
      : this.issueLearningPathCompletion(event as CertificateAuthoritativeEventEnvelope<LearningPathCompletedEventPayload>);
  }

  public list(query: CertificateListQuery) { return this.certificateRepository.list(query); }
  public analytics() { return this.certificateRepository.analytics(); }
  public listTemplates() { return this.certificateRepository.listTemplates(); }
  public listIssuers() { return this.certificateRepository.listIssuers(); }
  public getCertificate(id: string) { return this.certificateRepository.findById(id); }
  public listLedger(id: string) { return this.certificateRepository.listLedger(id); }
  public listStudentCertificates(studentReferenceId: string) { return this.certificateRepository.listByStudent(studentReferenceId); }
  public async attachRenderedArtifacts(certificateId: string, input: Omit<AttachCertificateArtifactsDto, 'certificateId' | 'actorId' | 'correlationId'>, actorId = 'phase14-artifact-renderer', correlationId?: string) {
    await this.requireCertificate(certificateId);
    const assetIds = [input.certificatePdfAssetId, input.previewImageAssetId, input.verificationQrAssetId].filter((value): value is string => Boolean(value));
    if (!assetIds.length) throw new Error('CERTIFICATE_RENDERED_ARTIFACT_REQUIRED');
    for (const assetId of assetIds) await this.ensureActiveAsset(assetId, 'CERTIFICATE_RENDERED_ARTIFACT');
    return this.certificateRepository.attachArtifacts({ certificateId, ...input, actorId, correlationId });
  }
  public async readiness() {
    const [templates, issuers] = await Promise.all([this.certificateRepository.listTemplates(), this.certificateRepository.listIssuers()]);
    const runtime = this.trustPolicy.runtimeReadiness();
    const activeTemplate = templates.some((item) => item.status === CertificateTemplateStatus.ACTIVE && item.currentVersion.status === CertificateTemplateStatus.ACTIVE);
    const activeIssuer = issuers.some((item) => item.status === 'ACTIVE');
    return {
      activeTemplate,
      activeIssuer,
      trustedCompletionIssuanceReady: activeTemplate && activeIssuer && (!runtime.productionLike || (runtime.signingProviderConfigured && runtime.signingKeyReferenceConfigured && runtime.publicVerificationBaseUrlConfigured)),
      artifactRendererMode: 'EAP_ASYNC',
      artifactRendererRuntimeReady: false,
      ...runtime,
    };
  }

  public async createIssuer(
    input: Omit<CreateCertificateIssuerDto, 'publicId' | 'status'> & { status?: CertificateIssuerStatus },
    context: CertificateMutationContext,
  ) {
    this.validateIssuer(input);
    await this.ensureActiveAsset(input.issuerLogoAssetId, 'CERTIFICATE_ISSUER_LOGO');
    return this.certificateRepository.createIssuer({
      ...input,
      publicId: `cert-issuer-${randomUUID()}`,
      status: input.status ?? 'ACTIVE',
    }, context);
  }

  public async updateIssuer(id: string, input: UpdateCertificateIssuerDto, context: CertificateMutationContext) {
    if (input.issuerLogoAssetId) await this.ensureActiveAsset(input.issuerLogoAssetId, 'CERTIFICATE_ISSUER_LOGO');
    if (input.signingKeyReference !== undefined && !input.signingKeyReference.trim()) throw new Error('CERTIFICATE_ISSUER_SIGNING_KEY_REQUIRED');
    return this.certificateRepository.updateIssuer(id, input, context);
  }

  /** Bootstrap can create a draft only; issuance never auto-creates or auto-activates it. */
  public async bootstrapDefaultCourseTemplateDraft(issuerId: string, context: CertificateMutationContext): Promise<CertificateTemplateDto> {
    const existing = (await this.certificateRepository.listTemplates()).find(item => item.code === 'MNR-SIGNATURE');
    if (existing) return existing;
    return this.createTemplate({
      code: 'MNR-SIGNATURE',
      name: 'MANARATAK Signature Certificate',
      nameAr: 'قالب مناراتك الاحترافي',
      nameEn: 'MANARATAK Signature Certificate',
      templateVersion: '1.0.0',
      issuerId,
      language: 'BILINGUAL',
      layout: 'LANDSCAPE',
      accentColor: '#142B5F',
      secondaryColor: '#D6A43B',
      titleAr: 'شهادة إتمام',
      titleEn: 'CERTIFICATE OF COMPLETION',
      bodyAr: 'تشهد منصة منارتك بأن المتعلم قد أتم بنجاح متطلبات هذه الدورة واستحق شهادة الإتمام الرقمية القابلة للتحقق.',
      bodyEn: 'MANARATAK confirms that the learner has successfully completed the course requirements and earned this digitally verifiable certificate of completion.',
      signatoryNameAr: 'إدارة الشهادات — منارتك',
      signatoryNameEn: 'MANARATAK Certificates Office',
      signatoryTitleAr: 'توقيع الإصدار الرقمي',
      signatoryTitleEn: 'Digital Issuance Signature',
      validityPolicy: 'PERMANENT',
      requiresRevalidation: false,
      metadata: { phase: 'Phase 14', eapAssetsRequiredForProduction: true },
    }, context);
  }

  public async createTemplate(input: CertificateTemplateAuthoringInput, context: CertificateMutationContext) {
    this.validateTemplate(input);
    await this.ensureActiveAssets(input);
    await this.requireActiveIssuer(input.issuerId);
    return this.certificateRepository.createTemplate({
      ...input,
      publicId: `cert-template-${randomUUID()}`,
      status: CertificateTemplateStatus.DRAFT,
    }, context);
  }

  public async updateTemplate(id: string, input: UpdateCertificateTemplateDto, context: CertificateMutationContext) {
    this.validateTemplate(input);
    await this.ensureActiveAssets(input);
    if (input.issuerId) await this.requireActiveIssuer(input.issuerId);
    return this.certificateRepository.updateTemplate(id, input, context);
  }

  public async transitionTemplate(id: string, status: CertificateTemplateStatus, context: CertificateMutationContext) {
    const template = await this.certificateRepository.findTemplateById(id);
    if (!template) throw new Error('CERTIFICATE_TEMPLATE_NOT_FOUND');
    if (!templateTransitions[template.status].includes(status)) throw new Error('CERTIFICATE_TEMPLATE_TRANSITION_INVALID');
    if (status === CertificateTemplateStatus.ACTIVE) await this.requireActiveIssuer(template.issuerId);
    return this.certificateRepository.transitionTemplate(id, status, context);
  }

  public revoke(id: string, reason: string, actorId = 'admin', correlationId?: string) {
    if (reason.trim().length < 8) throw new Error('REVOCATION_REASON_TOO_SHORT');
    return this.certificateRepository.revoke({ certificateId: id, reason: reason.trim(), actorId, correlationId });
  }

  public archive(id: string, reason: string, actorId = 'admin', correlationId?: string) {
    if (!reason.trim()) throw new Error('ARCHIVE_REASON_REQUIRED');
    return this.certificateRepository.archive(id, actorId, reason.trim(), correlationId);
  }

  public async expireDue(asOf = new Date(), actorId = 'phase14-system', correlationId?: string): Promise<number> {
    return this.certificateRepository.expireDue(asOf, actorId, correlationId);
  }

  public async renew(id: string, reason: string, actorId = 'admin', correlationId?: string): Promise<CertificateDto> {
    if (reason.trim().length < 8) throw new Error('RENEWAL_REASON_TOO_SHORT');
    const source = await this.requireCertificate(id);
    if (source.validityPolicy !== 'RENEWABLE') throw new Error('CERTIFICATE_NOT_RENEWABLE');
    if (![CertificateStatus.ACTIVE, CertificateStatus.EXPIRED].includes(source.status)) throw new Error('CERTIFICATE_RENEWAL_STATE_INVALID');
    const template = await this.requireActiveTemplate(source.templateId);
    const periodDays = template.renewalPeriodDays ?? template.validityDurationDays;
    if (!periodDays || periodDays <= 0) throw new Error('CERTIFICATE_RENEWAL_PERIOD_REQUIRED');
    const replacement = await this.buildReplacement(source, template, actorId, source.recipientDisplayName ?? undefined, `renewal:${source.id}:${randomUUID()}`, periodDays);
    return this.certificateRepository.reissue({ certificateId: id, reason: reason.trim(), actorId, correlationId, replacement, eventType: 'CertificateRenewed' });
  }

  public async reissue(id: string, reason: string, actorId = 'admin', recipientDisplayName?: string, templateId?: string, correlationId?: string) {
    if (reason.trim().length < 8) throw new Error('REISSUE_REASON_TOO_SHORT');
    const source = await this.requireCertificate(id);
    if (source.status !== CertificateStatus.REVOKED) throw new Error('CERTIFICATE_MUST_BE_REVOKED_BEFORE_REISSUE');
    const template = await this.requireActiveTemplate(templateId ?? source.templateId);
    const replacement = await this.buildReplacement(source, template, actorId, recipientDisplayName ?? source.recipientDisplayName ?? undefined, `reissue:${source.id}:${randomUUID()}`);
    return this.certificateRepository.reissue({ certificateId: id, reason: reason.trim(), actorId, recipientDisplayName, templateId, correlationId, replacement, eventType: 'CertificateReissued' });
  }

  public async verifyByCode(code: string): Promise<CertificateVerificationDto> {
    const certificate = await this.certificateRepository.findByVerificationCode(code.trim());
    if (!certificate) throw new Error('Certificate not found');
    const envelope = this.readSignedEnvelope(certificate.metadata?.signedEnvelope);
    const canonical = envelope ? this.canonicalJson(envelope) : null;
    const integrityVerified = Boolean(
      envelope &&
      canonical &&
      this.digest(canonical) === certificate.verificationHash &&
      this.persistedIdentityMatchesEnvelope(certificate, envelope) &&
      this.trustPolicy.verifyHash(certificate.verificationHash, certificate.digitalSignature, envelope.issuer.signingKeyReference),
    );
    const expiresAt = envelope?.validity.expiresAt ? new Date(envelope.validity.expiresAt) : null;
    const expired = Boolean(expiresAt && expiresAt <= new Date());
    const isValid = certificate.status === CertificateStatus.ACTIVE && !expired && integrityVerified;
    await this.certificateRepository.recordVerification(certificate.id, isValid ? 'VALID' : expired ? 'EXPIRED' : certificate.status, 'PUBLIC_CODE');
    const achievement = envelope?.achievement;
    return {
      publicId: certificate.publicId,
      serialNumber: certificate.serialNumber,
      verificationCode: certificate.verificationCode,
      verificationUrl: certificate.verificationUrl,
      verificationHash: certificate.verificationHash,
      status: expired ? CertificateStatus.EXPIRED : certificate.status,
      certificateType: envelope?.certificateType ?? certificate.certificateType,
      recipientDisplayName: envelope?.recipientDisplayName ?? certificate.recipientDisplayName,
      achievementType: achievement?.type ?? certificate.achievementType,
      achievementDisplayName: achievement?.displayName ?? certificate.achievementDisplayName,
      courseDisplayName: achievement?.type === 'COURSE' ? achievement.displayName : undefined,
      learningPathDisplayName: achievement?.type === 'LEARNING_PATH' ? achievement.displayName : undefined,
      completedAt: achievement ? new Date(achievement.completedAt) : certificate.completedAt,
      issuedAt: envelope ? new Date(envelope.issuedAt) : certificate.issuedAt,
      expiresAt,
      validityPolicy: envelope?.validity.policy ?? certificate.validityPolicy,
      issuerId: envelope?.issuer.issuerId ?? certificate.issuerId,
      issuerName: envelope?.issuer.issuerName ?? certificate.issuerName,
      grade: envelope?.grade ?? certificate.grade,
      skills: envelope?.skills ?? certificate.skills,
      competencies: envelope?.competencies ?? certificate.competencies,
      templateVersion: envelope?.template.versionNumber ?? certificate.templateVersion,
      revokedAt: certificate.revokedAt,
      revocationReason: certificate.revocationReason,
      isValid,
      integrityVerified,
    };
  }

  private async issueCourseCompletion(event: CertificateAuthoritativeEventEnvelope<CourseCompletedEventPayload>): Promise<CertificateDto> {
    const payload = event.payload;
    if (!payload.eligibleForCertificate) throw new Error('Course completion is not eligible (COURSE_COMPLETION_NOT_ELIGIBLE)');
    const existing = await this.certificateRepository.findBySourceCompletionId(payload.completionId);
    if (existing) return existing;
    const course = await this.courseRepository.findById(payload.courseId);
    if (!course) throw new Error('COURSE_NOT_FOUND');
    if (course.originType !== CourseOriginType.NATIVE_MANARATAK_COURSE) {
      throw new Error('MANARATAK_CERTIFICATE_NATIVE_COURSE_REQUIRED');
    }
    if (!course.certificateAvailable) throw new Error('COURSE_CERTIFICATE_DISABLED');
    const template = await this.requireDefaultActiveTemplate();
    const recipientDisplayName = await this.resolveRecipientDisplayName(payload.studentReferenceId);
    return this.issueAchievement(event, template, {
      certificateType: 'COURSE',
      type: 'COURSE',
      id: payload.courseId,
      displayName: course.displayName,
      completionId: payload.completionId,
      completedAt: new Date(payload.completedAt),
      courseId: payload.courseId,
      courseDisplayName: course.displayName,
      courseCompletionId: payload.completionId,
    }, recipientDisplayName);
  }

  private async issueLearningPathCompletion(event: CertificateAuthoritativeEventEnvelope<LearningPathCompletedEventPayload>): Promise<CertificateDto> {
    const payload = event.payload;
    if (!payload.eligibleForCertificate) throw new Error('Learning path completion is not eligible (LEARNING_PATH_COMPLETION_NOT_ELIGIBLE)');
    if (!this.learningPathRepository) throw new Error('LEARNING_PATH_REPOSITORY_NOT_CONFIGURED');
    const path = await this.learningPathRepository.findById(payload.learningPathId);
    if (!path) throw new Error('LEARNING_PATH_NOT_FOUND');
    const completionId = event.eventId;
    const existing = await this.certificateRepository.findByLearningPathCompletionId(completionId);
    if (existing) return existing;
    const template = await this.requireDefaultActiveTemplate();
    const recipientDisplayName = await this.resolveRecipientDisplayName(payload.studentReferenceId);
    return this.issueAchievement(event, template, {
      certificateType: 'LEARNING_PATH',
      type: 'LEARNING_PATH',
      id: payload.learningPathId,
      displayName: path.title,
      completionId,
      completedAt: new Date(payload.completedAt),
      learningPathId: payload.learningPathId,
      learningPathDisplayName: path.title,
      learningPathCompletionId: completionId,
    }, recipientDisplayName);
  }

  private async issueAchievement(
    event: CertificateAuthoritativeEventEnvelope<CourseCompletedEventPayload | LearningPathCompletedEventPayload>,
    template: CertificateTemplateDto,
    achievement: {
      certificateType: 'COURSE' | 'LEARNING_PATH';
      type: 'COURSE' | 'LEARNING_PATH';
      id: string;
      displayName: string;
      completionId: string;
      completedAt: Date;
      courseId?: string;
      courseDisplayName?: string;
      courseCompletionId?: string;
      learningPathId?: string;
      learningPathDisplayName?: string;
      learningPathCompletionId?: string;
    },
    recipientDisplayName: string | null,
  ): Promise<CertificateDto> {
    const issuer = await this.requireActiveIssuer(template.issuerId);
    this.trustPolicy.assertIssuerKeyAvailable(issuer.signingKeyReference);
    const issuedAt = new Date();
    const expiresAt = this.expirationFor(template, issuedAt);
    const serialNumber = this.trustPolicy.generate({ issuerPrefix: issuer.code, certificateTypePrefix: achievement.type === 'COURSE' ? 'CRS' : 'LP', issuedAt, studentReferenceId: event.payload.studentReferenceId, completionIdentity: achievement.completionId });
    const verificationCode = `MNR-${this.digest(`${event.eventId}:${serialNumber}`).slice(0, 18).toUpperCase()}`;
    const verificationUrl = this.trustPolicy.createPublicVerificationUrl(verificationCode);
    const verificationQr = this.trustPolicy.createPayload(verificationCode, verificationUrl);
    const envelope = this.signedEnvelope({
      certificateType: achievement.certificateType,
      studentReferenceId: event.payload.studentReferenceId,
      recipientDisplayName,
      achievement,
      issuedAt,
      expiresAt,
      template,
      issuer,
      replacesCertificateId: null,
    });
    const verificationHash = this.digest(this.canonicalJson(envelope));
    const eventPayloadHash = this.digest(this.canonicalJson(event.payload));
    return this.certificateRepository.issue({
      publicId: `cert-${randomUUID()}`,
      serialNumber,
      verificationCode,
      verificationUrl,
      verificationHash,
      status: CertificateStatus.ACTIVE,
      certificateType: achievement.certificateType,
      studentReferenceId: event.payload.studentReferenceId,
      recipientDisplayName,
      achievementType: achievement.type,
      achievementId: achievement.id,
      achievementDisplayName: achievement.displayName,
      sourceCompletionId: achievement.completionId,
      completedAt: achievement.completedAt,
      sourceEventId: event.eventId,
      sourceEventType: event.eventType,
      sourceEventVersion: event.eventVersion,
      sourceEventPayloadHash: eventPayloadHash,
      courseId: achievement.courseId,
      courseDisplayName: achievement.courseDisplayName,
      courseCompletionId: achievement.courseCompletionId,
      courseCompletedAt: achievement.type === 'COURSE' ? achievement.completedAt : null,
      learningPathId: achievement.learningPathId,
      learningPathDisplayName: achievement.learningPathDisplayName,
      learningPathCompletionId: achievement.learningPathCompletionId,
      issuedAt,
      expiresAt,
      validityPolicy: template.validityPolicy,
      renewalPolicy: template.renewalPolicy,
      requiresRevalidation: template.requiresRevalidation,
      templateId: template.id,
      templateVersionId: template.currentVersionId,
      templateVersion: template.templateVersion,
      issuerId: issuer.id,
      issuerName: issuer.name,
      issuerReferenceId: issuer.publicId,
      digitalSignature: this.trustPolicy.signHash(verificationHash, issuer.signingKeyReference),
      signingKeyReference: issuer.signingKeyReference,
      skills: [],
      competencies: [],
      metadata: { signedEnvelope: envelope, verificationQr, issuedFromEvent: event.eventType, sourceEventId: event.eventId, sourcePhase: event.payload.sourcePhase, certificateOwnerPhase: event.payload.certificateOwnerPhase, artifactState: 'AWAITING_EAP_RENDER' },
      actorId: 'phase14-system',
    });
  }

  private async buildReplacement(source: CertificateDto, template: CertificateTemplateDto, actorId: string, recipientDisplayName: string | undefined, sourceEventId: string, forcedDurationDays?: number) {
    const issuer = await this.requireActiveIssuer(template.issuerId);
    this.trustPolicy.assertIssuerKeyAvailable(issuer.signingKeyReference);
    const issuedAt = new Date();
    const expiresAt = forcedDurationDays
      ? new Date(issuedAt.getTime() + forcedDurationDays * 86400000)
      : this.expirationFor(template, issuedAt);
    const completionId = source.sourceCompletionId;
    const serialNumber = this.trustPolicy.generate({ issuerPrefix: issuer.code, certificateTypePrefix: source.achievementType === 'LEARNING_PATH' ? 'LP' : 'CRS', issuedAt, studentReferenceId: source.studentReferenceId, completionIdentity: sourceEventId });
    const verificationCode = `MNR-${this.digest(sourceEventId).slice(0, 18).toUpperCase()}`;
    const verificationUrl = this.trustPolicy.createPublicVerificationUrl(verificationCode);
    const verificationQr = this.trustPolicy.createPayload(verificationCode, verificationUrl);
    const envelope = this.signedEnvelope({
      certificateType: source.certificateType,
      studentReferenceId: source.studentReferenceId,
      recipientDisplayName: recipientDisplayName ?? null,
      achievement: {
        type: source.achievementType,
        id: source.achievementId,
        displayName: source.achievementDisplayName,
        completionId,
        completedAt: source.completedAt,
      },
      issuedAt,
      expiresAt,
      template,
      issuer,
      replacesCertificateId: source.id,
      grade: source.grade,
      score: source.score,
      skills: source.skills,
      competencies: source.competencies,
    });
    const verificationHash = this.digest(this.canonicalJson(envelope));
    return {
      publicId: `cert-${randomUUID()}`,
      serialNumber,
      verificationCode,
      verificationUrl,
      verificationHash,
      status: CertificateStatus.ACTIVE,
      certificateType: source.certificateType,
      studentReferenceId: source.studentReferenceId,
      recipientDisplayName: recipientDisplayName ?? source.recipientDisplayName,
      achievementType: source.achievementType,
      achievementId: source.achievementId,
      achievementDisplayName: source.achievementDisplayName,
      sourceCompletionId: source.sourceCompletionId,
      completedAt: source.completedAt,
      sourceEventId,
      sourceEventType: source.sourceEventType,
      sourceEventVersion: source.sourceEventVersion,
      sourceEventPayloadHash: source.sourceEventPayloadHash,
      courseId: source.courseId,
      courseDisplayName: source.courseDisplayName,
      courseCompletionId: source.courseCompletionId,
      courseCompletedAt: source.courseCompletedAt,
      learningPathId: source.learningPathId,
      learningPathDisplayName: source.learningPathDisplayName,
      learningPathCompletionId: source.learningPathCompletionId,
      issuedAt,
      expiresAt,
      validityPolicy: template.validityPolicy,
      renewalPolicy: template.renewalPolicy,
      requiresRevalidation: template.requiresRevalidation,
      templateId: template.id,
      templateVersionId: template.currentVersionId,
      templateVersion: template.templateVersion,
      issuerId: issuer.id,
      issuerName: issuer.name,
      issuerReferenceId: issuer.publicId,
      grade: source.grade,
      score: source.score,
      skills: [...source.skills],
      competencies: [...source.competencies],
      digitalSignature: this.trustPolicy.signHash(verificationHash, issuer.signingKeyReference),
      signingKeyReference: issuer.signingKeyReference,
      metadata: { signedEnvelope: envelope, verificationQr, reissuedFromCertificateId: source.id },
      actorId,
    };
  }

  private signedEnvelope(input: {
    certificateType: CertificateSignedEnvelopeV2['certificateType'];
    studentReferenceId: string;
    recipientDisplayName: string | null;
    achievement: { type: 'COURSE' | 'LEARNING_PATH'; id: string; displayName: string; completionId: string; completedAt: Date };
    issuedAt: Date;
    expiresAt: Date | null;
    template: CertificateTemplateDto;
    issuer: Awaited<ReturnType<CertificateUseCases['requireActiveIssuer']>>;
    replacesCertificateId: string | null;
    grade?: string | null;
    score?: number | null;
    skills?: string[];
    competencies?: string[];
  }): CertificateSignedEnvelopeV2 {
    return {
      schemaVersion: 'certificate-envelope-v2',
      certificateType: input.certificateType,
      studentReferenceId: input.studentReferenceId,
      recipientDisplayName: input.recipientDisplayName,
      achievement: { ...input.achievement, completedAt: input.achievement.completedAt.toISOString() },
      issuedAt: input.issuedAt.toISOString(),
      validity: { policy: input.template.validityPolicy, expiresAt: input.expiresAt?.toISOString() ?? null, renewalPolicy: input.template.renewalPolicy ?? null, requiresRevalidation: input.template.requiresRevalidation },
      template: { templateId: input.template.id, templateVersionId: input.template.currentVersionId, versionNumber: input.template.templateVersion },
      issuer: { issuerId: input.issuer.id, issuerPublicId: input.issuer.publicId, issuerName: input.issuer.name, issuerType: input.issuer.issuerType, signingKeyReference: input.issuer.signingKeyReference },
      grade: input.grade ?? null,
      score: input.score ?? null,
      skills: input.skills ?? [],
      competencies: input.competencies ?? [],
      replacesCertificateId: input.replacesCertificateId,
    };
  }

  private assertAuthoritativeCompletionEnvelope(event: CertificateAuthoritativeEventEnvelope<CourseCompletedEventPayload | LearningPathCompletedEventPayload>): void {
    if (!event.eventId?.trim()) throw new Error('CERTIFICATE_SOURCE_EVENT_ID_REQUIRED');
    if (event.sourceDomain !== 'COURSES') throw new Error('CERTIFICATE_SOURCE_EVENT_DOMAIN_INVALID');
    if (event.eventVersion !== '1.0.0') throw new Error('CERTIFICATE_SOURCE_EVENT_VERSION_UNSUPPORTED');
    if (!['CourseCompleted', 'LearningPathCompleted'].includes(event.eventType)) throw new Error('CERTIFICATE_SOURCE_EVENT_TYPE_INVALID');
    if (event.payload.sourcePhase !== 'Phase 13 - Learning Platform' || event.payload.certificateOwnerPhase !== 'Phase 14 - Enterprise Certificates Platform') throw new Error('CERTIFICATE_SOURCE_EVENT_AUTHORITY_INVALID');
    if (Number.isNaN(new Date(event.occurredAt).getTime())) throw new Error('CERTIFICATE_SOURCE_EVENT_TIMESTAMP_INVALID');
  }

  private async resolveRecipientDisplayName(studentReferenceId: string): Promise<string | null> {
    if (!this.identityRepository) return null;
    const identity = await this.identityRepository.findById(studentReferenceId);
    const displayName = identity?.user?.profile?.props?.displayName?.trim();
    if (!displayName || displayName === 'ANONYMOUS') return null;
    return displayName.slice(0, 180);
  }

  private async requireDefaultActiveTemplate(): Promise<CertificateTemplateDto> {
    const template = await this.certificateRepository.findActiveTemplateByName('MANARATAK Signature Certificate');
    if (!template || template.status !== CertificateTemplateStatus.ACTIVE) throw new Error('ACTIVE_CERTIFICATE_TEMPLATE_REQUIRED');
    if (template.currentVersion.status !== CertificateTemplateStatus.ACTIVE) throw new Error('ACTIVE_CERTIFICATE_TEMPLATE_VERSION_REQUIRED');
    return template;
  }

  private async requireActiveTemplate(id: string | null | undefined): Promise<CertificateTemplateDto> {
    if (!id) throw new Error('ACTIVE_CERTIFICATE_TEMPLATE_REQUIRED');
    const template = await this.certificateRepository.findTemplateById(id);
    if (!template || template.status !== CertificateTemplateStatus.ACTIVE || template.currentVersion.status !== CertificateTemplateStatus.ACTIVE) throw new Error('ACTIVE_CERTIFICATE_TEMPLATE_REQUIRED');
    return template;
  }

  private async requireActiveIssuer(id: string) {
    const issuer = await this.certificateRepository.findIssuerById(id);
    if (!issuer || issuer.status !== 'ACTIVE') throw new Error('ACTIVE_CERTIFICATE_ISSUER_REQUIRED');
    if (!issuer.issuerLogoAssetId || !issuer.signingKeyReference) throw new Error('CERTIFICATE_ISSUER_AUTHORITY_INCOMPLETE');
    return issuer;
  }

  private async requireCertificate(id: string): Promise<CertificateDto> {
    const certificate = await this.certificateRepository.findById(id);
    if (!certificate) throw new Error('CERTIFICATE_NOT_FOUND');
    return certificate;
  }

  private expirationFor(template: CertificateTemplateDto, issuedAt: Date): Date | null {
    if (template.validityPolicy === 'PERMANENT') return null;
    if (!template.validityDurationDays || template.validityDurationDays <= 0) throw new Error('CERTIFICATE_VALIDITY_DURATION_REQUIRED');
    if (template.validityPolicy === 'RENEWABLE' && (!template.renewalPeriodDays || template.renewalPeriodDays <= 0)) throw new Error('CERTIFICATE_RENEWAL_PERIOD_REQUIRED');
    return new Date(issuedAt.getTime() + template.validityDurationDays * 86400000);
  }

  private validateIssuer(input: { code: string; name: string; issuerType: CertificateIssuerType; issuerLogoAssetId: string; signingKeyReference: string; universityId?: string | null; accreditationAuthority?: string | null; accreditationReference?: string | null }): void {
    if (!/^[A-Z0-9_-]{2,32}$/u.test(input.code)) throw new Error('CERTIFICATE_ISSUER_CODE_INVALID');
    if (!input.name.trim()) throw new Error('CERTIFICATE_ISSUER_NAME_REQUIRED');
    if (!input.issuerLogoAssetId.trim()) throw new Error('CERTIFICATE_ISSUER_LOGO_REQUIRED');
    if (!input.signingKeyReference.trim()) throw new Error('CERTIFICATE_ISSUER_SIGNING_KEY_REQUIRED');
    if (input.issuerType === 'UNIVERSITY' && !input.universityId?.trim()) throw new Error('CERTIFICATE_ISSUER_CANONICAL_UNIVERSITY_REQUIRED');
    if (input.issuerType !== 'MANARATAK' && (!input.accreditationAuthority?.trim() || !input.accreditationReference?.trim())) {
      throw new Error('CERTIFICATE_ISSUER_ACCREDITATION_REQUIRED');
    }
  }

  private validateTemplate(input: UpdateCertificateTemplateDto): void {
    for (const color of [input.accentColor, input.secondaryColor]) if (color && !/^#[0-9A-F]{6}$/i.test(color)) throw new Error('CERTIFICATE_TEMPLATE_COLOR_INVALID');
    for (const asset of [input.logoAssetId, input.sealAssetId, input.signatureAssetId, input.designAssetId]) if (asset && /^https?:|^file:|[\\/]/i.test(asset)) throw new Error('CERTIFICATE_TEMPLATE_RAW_ASSET_FORBIDDEN');
    if (input.validityDurationDays !== undefined && input.validityDurationDays !== null && (!Number.isInteger(input.validityDurationDays) || input.validityDurationDays <= 0)) throw new Error('CERTIFICATE_VALIDITY_DURATION_INVALID');
    if (input.renewalPeriodDays !== undefined && input.renewalPeriodDays !== null && (!Number.isInteger(input.renewalPeriodDays) || input.renewalPeriodDays <= 0)) throw new Error('CERTIFICATE_RENEWAL_PERIOD_INVALID');
  }

  private async ensureActiveAssets(input: UpdateCertificateTemplateDto): Promise<void> {
    const assetIds = [input.logoAssetId, input.sealAssetId, input.signatureAssetId, input.designAssetId].filter((value): value is string => Boolean(value));
    for (const assetId of assetIds) await this.ensureActiveAsset(assetId, 'CERTIFICATE_TEMPLATE_ASSET');
  }

  private async ensureActiveAsset(assetId: string, prefix: string): Promise<void> {
    if (/^https?:|^file:|[\\/]/i.test(assetId)) throw new Error(`${prefix}_RAW_ASSET_FORBIDDEN`);
    if (!this.assetRepository) throw new Error('CERTIFICATE_ASSET_PLATFORM_NOT_CONFIGURED');
    const asset = await this.assetRepository.findById(new AssetId(assetId));
    if (!asset) throw new Error(`${prefix}_NOT_FOUND`);
    if (asset.state !== AssetLifecycleState.ACTIVE) throw new Error(`${prefix}_NOT_ACTIVE:${asset.state}`);
    if (![AssetSecurityClassification.PUBLIC, AssetSecurityClassification.INTERNAL].includes(asset.classification)) {
      throw new Error(`${prefix}_CLASSIFICATION_NOT_ALLOWED:${asset.classification}`);
    }
    if (!asset.metadata.mimeType.toLowerCase().startsWith('image/')) {
      throw new Error(`${prefix}_MIME_NOT_ALLOWED:${asset.metadata.mimeType}`);
    }
  }

  private persistedIdentityMatchesEnvelope(certificate: CertificateDto, envelope: CertificateSignedEnvelopeV2): boolean {
    return certificate.certificateType === envelope.certificateType &&
      certificate.studentReferenceId === envelope.studentReferenceId &&
      certificate.achievementType === envelope.achievement.type &&
      certificate.achievementId === envelope.achievement.id &&
      certificate.sourceCompletionId === envelope.achievement.completionId &&
      certificate.templateId === envelope.template.templateId &&
      certificate.templateVersionId === envelope.template.templateVersionId &&
      certificate.issuerId === envelope.issuer.issuerId &&
      certificate.signingKeyReference === envelope.issuer.signingKeyReference;
  }

  private readSignedEnvelope(value: unknown): CertificateSignedEnvelopeV2 | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const envelope = value as Partial<CertificateSignedEnvelopeV2>;
    if (envelope.schemaVersion !== 'certificate-envelope-v2' || !envelope.achievement || !envelope.validity || !envelope.template || !envelope.issuer) return null;
    return envelope as CertificateSignedEnvelopeV2;
  }

  private digest(value: string): string { return createHash('sha256').update(value).digest('hex'); }

  private canonicalJson(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
    if (value instanceof Date) return JSON.stringify(value.toISOString());
    if (Array.isArray(value)) return `[${value.map(item => this.canonicalJson(item)).join(',')}]`;
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().filter(key => record[key] !== undefined).map(key => `${JSON.stringify(key)}:${this.canonicalJson(record[key])}`).join(',')}}`;
  }

}
