import { AIExecutionOrchestrator } from '@manaratak/application';
import {
  AIExecutionStatus,
  IEnterpriseAIConsumerGateway,
  IScholarshipRecommendationGateway,
  IStudentToolRateLimitGateway,
  IStudentContextGateway,
  IReferenceResolver,
  IDegreeLevelRepository,
  IStudentToolSaveGateway,
  IStudentWorkspaceRepository,
  IStudentToolDependencyHealthGateway,
  IUniversityComparisonGateway,
  IScholarshipRepository,
  IUniversityRepository,
  ScholarshipCandidate,
  StudentToolDependency,
  StudentSavedItemType,
  UniversityComparisonItem,
} from '@manaratak/domain';
import { IRateLimiter } from '@manaratak/core';

export class Phase17StudentToolsAIConsumerGateway implements IEnterpriseAIConsumerGateway {
  constructor(private readonly orchestrator: AIExecutionOrchestrator) {}
  async executeCapability<TResult>(
    request: Parameters<IEnterpriseAIConsumerGateway['executeCapability']>[0],
  ) {
    try {
      const response = await this.orchestrator.executeCapability({
        consumerKey: request.consumerKey,
        capabilityKey: request.capabilityKey,
        input: JSON.stringify(request.payload),
        locale: request.locale,
        sourceDomain: 'Phase18StudentTools',
        metadata: {
          correlationId: request.correlationId,
          dataClassification: request.dataClassification,
        },
        dataClassification:
          request.dataClassification === 'PRIVATE_STUDENT_DATA'
            ? 'STUDENT_PRIVATE'
            : 'PUBLIC',
        idempotencyKey: request.idempotencyKey,
        structuredOutputSchema: request.outputSchema,
      });
      let result: TResult | undefined;
      if (response.result) {
        try {
          result = JSON.parse(response.result) as TResult;
        } catch {
          return {
            status: 'FAILED' as const,
            executionReference: response.executionPublicId,
            errorCode: 'AI_STRUCTURED_OUTPUT_INVALID',
          };
        }
      }
      return {
        status:
          response.status === AIExecutionStatus.COMPLETED
            ? ('COMPLETED' as const)
            : response.status === AIExecutionStatus.BLOCKED
              ? ('BLOCKED' as const)
              : ('FAILED' as const),
        result,
        executionReference: response.executionPublicId,
        safetyStatus: response.status === AIExecutionStatus.BLOCKED ? 'BLOCKED' : 'ALLOWED',
        errorCode: response.errorCode ?? undefined,
      };
    } catch (error) {
      const code = error instanceof Error ? error.message : 'AI_CAPABILITY_UNAVAILABLE';
      return {
        status:
          code.includes('NOT_CONFIGURED') || code.includes('NOT_DEPLOYED')
            ? ('NOT_CONFIGURED' as const)
            : ('FAILED' as const),
        errorCode: code,
      };
    }
  }
}

export class Phase15StudentContextGateway implements IStudentContextGateway {
  constructor(private readonly repository: IStudentWorkspaceRepository) {}
  async getMinimalContext(studentReference: string): ReturnType<IStudentContextGateway['getMinimalContext']> {
    const workspace = await this.repository.findWorkspace(studentReference);
    if (!workspace) return null;
    const metadata = workspace.metadata ?? {};
    const interests = Array.isArray(metadata.interests)
      ? metadata.interests.filter((item): item is string => typeof item === 'string').slice(0, 20)
      : undefined;
    const preferred = workspace.preferredLanguage?.toLowerCase();
    return {
      preferredLocale: preferred === 'ar' || preferred === 'en' ? preferred : undefined,
      educationalLevel: typeof metadata.educationalLevel === 'string' ? metadata.educationalLevel : undefined,
      targetDegree: typeof metadata.targetDegree === 'string' ? metadata.targetDegree : undefined,
      interests,
    };
  }
}

export class Phase15StudentToolSaveGateway implements IStudentToolSaveGateway {
  constructor(private readonly repository: IStudentWorkspaceRepository) {}
  async savePrivateResult(input: Parameters<IStudentToolSaveGateway['savePrivateResult']>[0]) {
    const saved = await this.repository.saveItem({
      studentReferenceId: input.studentReference,
      entityType: StudentSavedItemType.STUDENT_TOOL,
      entityId: input.executionId,
      entitySlug: input.toolKey,
      metadata: { sourceDomain: 'PHASE_18', resultReference: input.resultReference, privateResult: input.result },
    });
    return { savedReference: saved.id };
  }
}

export class CanonicalUniversityComparisonGateway implements IUniversityComparisonGateway {
  constructor(private readonly repository: IUniversityRepository) {}
  async getUniversitiesByPublicIds(publicIds: string[]) {
    const canonical = this.repository.findPublishedByPublicIds
      ? await this.repository.findPublishedByPublicIds(publicIds)
      : await this.findAcrossPublishedPages(publicIds);
    const selected = new Map(
      canonical
        .map((item) => [item.publicId, item]),
    );
    const available: UniversityComparisonItem[] = publicIds.flatMap((id) => {
      const item = selected.get(id);
      return item
        ? [
            {
              publicId: item.publicId,
              slug: item.slug,
              displayName: item.displayName,
              country: item.country,
              city: item.city,
              institutionType: item.institutionType,
              institutionalOwnership: item.institutionalOwnership,
              officialWebsite: item.officialWebsite,
              languagesOfInstruction: item.languagesOfInstruction,
              academicProgramCount: item.academicPrograms?.length ?? 0,
              updatedAt: item.updatedAt,
            },
          ]
        : [];
    });
    return { available, unavailableIds: publicIds.filter((id) => !selected.has(id)) };
  }
  private async findAcrossPublishedPages(publicIds: string[]) {
    const found = new Map<string, Awaited<ReturnType<IUniversityRepository['listPublished']>>['data'][number]>();
    let cursor: string | undefined;
    let hasMore = true;
    do {
      const page = await this.repository.listPublished({ cursor, limit: 100 });
      for (const item of page.data)
        if (publicIds.includes(item.publicId)) found.set(item.publicId, item);
      cursor = page.nextCursor ?? undefined;
      hasMore = page.hasMore === true && Boolean(cursor);
    } while (hasMore && found.size < publicIds.length);
    return [...found.values()];
  }
}

export class CanonicalScholarshipRecommendationGateway implements IScholarshipRecommendationGateway {
  constructor(
    private readonly repository: IScholarshipRepository,
    private readonly references: IReferenceResolver,
    private readonly degreeLevels: IDegreeLevelRepository,
  ) {}

  async findPublishedCandidates(filters: {
    countries: string[];
    targetDegree?: string;
    fundingPreference?: string;
    studyLanguage?: string;
  }) {
    const countryIds = await this.resolveCountries(filters.countries);
    const degreeLevelId = await this.resolveDegreeLevel(filters.targetDegree);
    const languageReferenceId = await this.resolveLanguage(filters.studyLanguage);
    const batches = countryIds.length ? countryIds : [undefined];
    const unique = new Map<string, ScholarshipCandidate>();

    for (const countryReferenceId of batches) {
      const items = await this.listAllPublished({
        countryReferenceId,
        degreeLevelId,
        studyLanguageReferenceId: languageReferenceId,
      });
      for (const item of items) {
        if (filters.fundingPreference === 'FULL' && !item.isFullyFunded) continue;
        unique.set(item.publicId, {
          publicId: item.publicId,
          slug: item.slug,
          displayName: item.displayName,
          country: item.countrySourceLabel ?? item.countryScope ?? item.countryReferenceId,
          degreeLevels: (item.degreeTargets ?? [])
            .map((target) => String(target.sourceLabel ?? target.degreeLevelId ?? ''))
            .filter(Boolean),
          fundingType: item.fundingTypeCode,
          isFullyFunded: item.isFullyFunded,
          deadline: item.applicationDeadline,
          canonicalUrl: item.officialWebsite ?? item.applicationUrl,
          publicationStatus: String(item.publicationStatus),
        });
      }
    }
    return [...unique.values()];
  }

  private async listAllPublished(
    filters: Parameters<IScholarshipRepository['listPublished']>[0],
  ) {
    const data: Awaited<ReturnType<IScholarshipRepository['listPublished']>>['data'] = [];
    let cursor: string | undefined;
    let hasMore = true;
    let scannedPages = 0;
    do {
      if (++scannedPages > 500) throw new Error('SCHOLARSHIP_RECOMMENDATION_CANDIDATE_SCAN_LIMIT_EXCEEDED');
      const result = await this.repository.listPublished({ ...filters, cursor, limit: 100 });
      data.push(...result.data);
      cursor = result.nextCursor ?? undefined;
      hasMore = result.hasMore === true && Boolean(cursor);
    } while (hasMore);
    return data;
  }

  private async resolveCountries(values: string[]): Promise<string[]> {
    const result: string[] = [];
    for (const value of values.map((v) => v.trim()).filter(Boolean)) {
      const resolved = await this.references.resolveCountry(referenceLookup(value));
      if (!resolved?.active) throw new Error(`SCHOLARSHIP_COUNTRY_REFERENCE_NOT_ACTIVE:${value}`);
      result.push(resolved.id);
    }
    return [...new Set(result)];
  }
  private async resolveLanguage(value?: string): Promise<string | undefined> {
    if (!value?.trim()) return undefined;
    const resolved = await this.references.resolveLanguage(referenceLookup(value));
    if (!resolved?.active) throw new Error(`SCHOLARSHIP_LANGUAGE_REFERENCE_NOT_ACTIVE:${value}`);
    return resolved.id;
  }
  private async resolveDegreeLevel(value?: string): Promise<string | undefined> {
    if (!value?.trim()) return undefined;
    const raw = value.trim();
    const byId = await this.degreeLevels.getDegreeLevelById(raw);
    if (byId?.status === 'ACTIVE') return byId.id;
    const byCode = await this.degreeLevels.getDegreeLevelByCode(raw.toUpperCase());
    if (!byCode || byCode.status !== 'ACTIVE') throw new Error(`SCHOLARSHIP_DEGREE_REFERENCE_NOT_ACTIVE:${value}`);
    return byCode.id;
  }
}

function referenceLookup(value: string) {
  const trimmed = value.trim();
  if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(trimmed) || trimmed.startsWith('mem-')) return { id: trimmed };
  if (/^[A-Za-z]{2,3}$/.test(trimmed)) return { standardCode: trimmed.toUpperCase() };
  return { alias: trimmed };
}

export class StudentToolRateLimitGateway implements IStudentToolRateLimitGateway {
  constructor(private readonly limiter: IRateLimiter) {}
  async consume(key: string, limit: number, windowMs: number) {
    try {
      const value = await this.limiter.consume(key, limit, windowMs);
      return { allowed: value.allowed, remaining: value.remaining, resetAt: value.resetTime };
    } catch {
      // Expensive Student Tool execution must fail closed if the shared quota store is unavailable.
      throw new Error('STUDENT_TOOL_QUOTA_STORE_UNAVAILABLE');
    }
  }
}

export class EnterpriseStudentToolDependencyHealthGateway
  implements IStudentToolDependencyHealthGateway
{
  constructor(
    private readonly aiExecution: AIExecutionOrchestrator,
    private readonly universities: IUniversityRepository,
    private readonly scholarships: IScholarshipRepository,
  ) {}

  async status(
    dependency: StudentToolDependency,
  ): Promise<'READY' | 'DEGRADED' | 'NOT_CONFIGURED' | 'UNAVAILABLE'> {
    try {
      if (dependency.phase === 'PHASE_11') {
        const page = await this.universities.listPublished({ limit: 1 });
        return page.total > 0 ? 'READY' : 'NOT_CONFIGURED';
      }
      if (dependency.phase === 'PHASE_12') {
        const page = await this.scholarships.listPublished({ limit: 1 });
        return page.total > 0 ? 'READY' : 'NOT_CONFIGURED';
      }
      if (dependency.phase === 'PHASE_17' && dependency.capabilityKey) {
        const dataClassification = dependency.capabilityKey.includes('motivation-letter')
          ? 'STUDENT_PRIVATE'
          : 'PUBLIC';
        const readiness = await this.aiExecution.capabilityReadiness({
          consumerKey: 'phase18-student-tools',
          capabilityKey: dependency.capabilityKey,
          dataClassification,
        });
        return readiness.ready ? 'READY' : 'NOT_CONFIGURED';
      }
      return 'NOT_CONFIGURED';
    } catch {
      return 'UNAVAILABLE';
    }
  }
}
