import {
  AssetReferencePolicy,
  assertAssetReferenceUsable,
} from '../../asset-platform/AssetReferencePolicy';
import {
  IStudentToolRegistryRepository,
  IStudentToolDependencyHealthGateway,
  StudentToolActivationReadinessService,
  StudentToolDefinition,
  StudentToolHealthService,
  StudentToolFilters,
  StudentToolExecutionFilters,
  StudentToolAuditFilters,
  StudentToolImplementationStatus,
  StudentToolLifecycleStatus,
  StudentToolVisibilityStatus,
  StudentToolPublicAccessPolicy,
} from '@manaratak/domain';
import { STUDENT_TOOL_SCHEMAS } from '../handlers/StudentToolSchemas';
import { OFFICIAL_STUDENT_TOOLS } from '../OfficialStudentToolRegistry';
export class StudentToolRegistryUseCases {
  constructor(
    private readonly repository: IStudentToolRegistryRepository,
    private readonly readinessService: StudentToolActivationReadinessService,
    private readonly healthService: StudentToolHealthService,
    private readonly dependencyHealth: IStudentToolDependencyHealthGateway,
    private readonly assetReferences?: AssetReferencePolicy,
  ) {}
  async installOfficialRegistry(actorReferenceId: string) {
    return installOfficialStudentToolRegistry(this.repository, actorReferenceId);
  }
  async listAdminPage(filters: StudentToolFilters & { page?: number; pageSize?: number }) {
    if (!this.repository.listPage) throw new Error('TOOL_PAGING_NOT_CONFIGURED');
    return this.repository.listPage(filters);
  }
  async release(
    toolKey: string,
    action: 'PROPOSE' | 'APPROVE' | 'REJECT' | 'ACTIVATE',
    actor: string,
    expectedRevision: number,
    reason: string,
  ) {
    if (!this.repository.release) throw new Error('TOOL_RELEASE_NOT_CONFIGURED');
    const tool = await this.repository.findByKey(toolKey);
    if (!tool) throw new Error('TOOL_NOT_FOUND');
    if (action === 'PROPOSE' || action === 'ACTIVATE') {
      const ready = await this.readinessService.evaluate(tool);
      if (!ready.ready) throw new Error('TOOL_NOT_READY');
      if (tool.availability.allowedRegions.length)
        throw new Error('TOOL_REGION_POLICY_UNAVAILABLE');
    }
    return this.repository.release(toolKey, action, actor, expectedRevision, reason);
  }
  async eligibility(
    toolKey: string,
    input: {
      consumerType: 'ANONYMOUS' | 'AUTHENTICATED_STUDENT';
      locale: 'ar' | 'en';
      region?: string;
    },
  ) {
    const tool = await this.repository.findByKey(toolKey);
    if (!tool) throw new Error('TOOL_NOT_FOUND');
    const reasons = StudentToolPublicAccessPolicy.consumerBlockers(tool, input.consumerType, input.locale);
    if (tool.availability.allowedRegions.length && (!input.region || !tool.availability.allowedRegions.includes(input.region))) reasons.push('REGION_DENIED');
    const readiness = await this.readinessService.evaluate(tool);
    if (!readiness.ready) reasons.push(...readiness.blockers);
    return { status: reasons.length ? 'BLOCKED' : 'WOULD_ALLOW', reasons };
  }
  listAdminTools(filters: StudentToolFilters = {}) {
    return this.repository.list(filters);
  }
  async listPublicTools(filters: StudentToolFilters = {}) {
    const tools = await this.repository.listPublic(filters);
    const search = filters.search?.trim().toLowerCase();
    return tools
      .filter(
        (tool) =>
          StudentToolPublicAccessPolicy.isDiscoverable(tool) &&
          (!filters.visibility || tool.visibility === filters.visibility) &&
          (!filters.implementationStatus ||
            tool.implementationStatus === filters.implementationStatus) &&
          (!filters.lifecycle || tool.lifecycle === filters.lifecycle) &&
          (!filters.executionType || tool.executionType === filters.executionType) &&
          (!search ||
            `${tool.nameAr} ${tool.nameEn} ${tool.toolKey} ${tool.descriptionAr} ${tool.descriptionEn}`
              .toLowerCase()
              .includes(search)),
      )
      .map(publicProjection);
  }
  findTool(toolKey: string) {
    return this.repository.findByKey(toolKey);
  }
  async findPublicTool(toolKey: string) {
    const tool = await this.repository.findByKey(toolKey);
    return tool && StudentToolPublicAccessPolicy.isDiscoverable(tool)
      ? publicProjection(tool)
      : null;
  }
  telemetry(toolKey?: string) {
    return this.repository.telemetry(toolKey);
  }
  executions(
    toolKey: string,
    page?: number,
    pageSize?: number,
    filters?: StudentToolExecutionFilters,
  ) {
    return this.repository.listExecutions(toolKey, page, pageSize, filters);
  }
  auditPage(toolKey: string, page: number, pageSize: number, filters?: StudentToolAuditFilters) {
    if (!this.repository.auditPage) throw new Error('TOOL_PAGING_NOT_CONFIGURED');
    return this.repository.auditPage(toolKey, page, pageSize, filters);
  }
  audit(toolKey: string) {
    return this.repository.audit(toolKey);
  }
  async operationalStatus(tool: StudentToolDefinition) {
    const dependencies = await Promise.all(
      tool.dependencies.map(async (dependency) => ({
        ...dependency,
        status: await this.dependencyHealth.status(dependency),
      })),
    );
    const [readiness, health] = await Promise.all([
      this.readinessService.evaluate(tool),
      this.healthService.compute(tool),
    ]);
    return { readiness, health, dependencies };
  }
  async update(
    toolKey: string,
    patch: Record<string, unknown>,
    actorReferenceId: string,
    expectedRevision?: number,
    reason?: string,
  ) {
    if (['visibility', 'implementationStatus', 'lifecycle'].some((key) => key in patch))
      throw new Error('TOOL_RELEASE_COMMAND_REQUIRED');
    if (typeof patch.iconAssetId === 'string' || patch.iconAssetId === null) {
      await assertAssetReferenceUsable(this.assetReferences, patch.iconAssetId as string | null, {
        purpose: 'STUDENT_TOOL_ICON',
      });
    }
    if (['toolKey', 'id', 'createdAt'].some((key) => key in patch))
      throw new Error('IMMUTABLE_TOOL_IDENTITY');
    const current = await this.repository.findByKey(toolKey);
    if (!current) throw new Error('TOOL_NOT_FOUND');
    const versionedFields = [
      'featureFlags',
      'availability',
      'rateLimitPolicy',
      'aiCapabilityKey',
      'executionType',
      'outputType',
      'supportedLocales',
      'inputSchema',
      'outputSchema',
      'dependencies',
    ];
    if (versionedFields.some((field) => field in patch))
      throw new Error('TOOL_VERSION_INCREMENT_REQUIRED');
    const availability = patch.availability as StudentToolDefinition['availability'] | undefined;
    const featureFlags = patch.featureFlags as StudentToolDefinition['featureFlags'] | undefined;
    if (availability?.adminOnly && availability.publicEnabled)
      throw new Error('CONFLICTING_AVAILABILITY_FLAGS');
    if (
      current.implementationStatus !== StudentToolImplementationStatus.IMPLEMENTED &&
      (availability?.publicEnabled || featureFlags?.globallyEnabled)
    )
      throw new Error('TOOL_NOT_IMPLEMENTED');
    return this.repository.updateDefinition(
      toolKey,
      patch,
      actorReferenceId,
      'STUDENT_TOOL_UPDATED',
      expectedRevision,
      reason,
    );
  }
  async updateVersionedConfiguration(
    toolKey: string,
    patch: Partial<StudentToolDefinition>,
    version: { semanticVersion: string; changeNote: string; expectedRevision?: number },
    actorReferenceId: string,
  ) {
    const current = await this.repository.findByKey(toolKey);
    if (!current) throw new Error('TOOL_NOT_FOUND');
    if (!/^\d+\.\d+\.\d+$/.test(version.semanticVersion))
      throw new Error('INVALID_TOOL_SEMANTIC_VERSION');
    if (compareSemver(version.semanticVersion, current.currentVersion.semanticVersion) <= 0)
      throw new Error('TOOL_VERSION_MUST_INCREMENT');
    if (!version.changeNote.trim()) throw new Error('TOOL_VERSION_CHANGE_NOTE_REQUIRED');
    const contract = STUDENT_TOOL_SCHEMAS[toolKey];
    const inputSchema = contract?.inputSchema ?? current.inputSchema;
    const outputSchema = contract?.outputSchema ?? current.outputSchema;
    const availability = patch.availability ?? current.availability;
    if (availability.allowedRegions.length) throw new Error('TOOL_REGION_POLICY_UNAVAILABLE');
    if (availability.adminOnly && availability.publicEnabled)
      throw new Error('CONFLICTING_AVAILABILITY_FLAGS');
    if (availability.anonymousEnabled && !availability.publicEnabled)
      throw new Error('CONFLICTING_AVAILABILITY_FLAGS');
    if (
      current.implementationStatus !== StudentToolImplementationStatus.IMPLEMENTED &&
      availability.publicEnabled
    )
      throw new Error('TOOL_NOT_IMPLEMENTED');
    const flags = patch.featureFlags ?? current.featureFlags;
    if (
      (flags.anonymousEnabled && !availability.anonymousEnabled) ||
      (flags.authenticatedEnabled && !availability.authenticatedEnabled)
    )
      throw new Error('CONFLICTING_AVAILABILITY_FLAGS');
    const next: StudentToolDefinition = {
      ...current,
      ...patch,
      lifecycle: StudentToolLifecycleStatus.TESTING,
      visibility: StudentToolVisibilityStatus.HIDDEN_ADMIN_ONLY,
      toolKey: current.toolKey,
      dependencies: patch.dependencies ?? current.dependencies,
      inputSchema,
      outputSchema,
      currentVersion: {
        semanticVersion: version.semanticVersion,
        inputSchemaVersion: inputSchema.version,
        outputSchemaVersion: outputSchema.version,
        releaseDate: new Date(),
        changeNote: version.changeNote.trim(),
        status: 'ACTIVE',
      },
    };
    return this.repository.upsertDefinition(next, actorReferenceId, version.expectedRevision);
  }

  async transition(
    toolKey: string,
    lifecycle: StudentToolLifecycleStatus,
    actorReferenceId: string,
    expectedRevision?: number,
    reason?: string,
  ) {
    if (lifecycle === StudentToolLifecycleStatus.ACTIVE)
      throw new Error('TOOL_RELEASE_APPROVAL_REQUIRED');
    const tool = await this.repository.findByKey(toolKey);
    if (!tool) throw new Error('TOOL_NOT_FOUND');
    const visibility =
      lifecycle === StudentToolLifecycleStatus.RETIRED
        ? StudentToolVisibilityStatus.RETIRED
        : StudentToolVisibilityStatus.HIDDEN_ADMIN_ONLY;
    return this.repository.updateDefinition(
      toolKey,
      { lifecycle, visibility },
      actorReferenceId,
      `STUDENT_TOOL_${lifecycle}`,
      expectedRevision,
      reason,
    );
  }
}

/** The API and approved-environment CLI share the same owner installation policy. */
export async function installOfficialStudentToolRegistry(
  repository: IStudentToolRegistryRepository,
  actorReferenceId: string,
): Promise<StudentToolDefinition[]> {
  if (!actorReferenceId) throw new Error('ACTOR_REQUIRED');
  const values: StudentToolDefinition[] = [];
  for (const tool of OFFICIAL_STUDENT_TOOLS) {
    values.push(await repository.upsertDefinition({
      ...tool,
      lifecycle: StudentToolLifecycleStatus.TESTING,
      visibility: StudentToolVisibilityStatus.HIDDEN_ADMIN_ONLY,
    }, actorReferenceId));
  }
  return values;
}

function compareSemver(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function publicProjection(tool: StudentToolDefinition) {
  const {
    toolKey,
    nameAr,
    nameEn,
    descriptionAr,
    descriptionEn,
    category,
    executionType,
    implementationStatus,
    lifecycle,
    visibility,
    availability,
    featureFlags,
    inputSchema,
    outputSchema,
    estimatedMinutes,
    tags,
    iconAssetId,
    supportedLocales,
  } = tool;
  return {
    toolKey,
    nameAr,
    nameEn,
    descriptionAr,
    descriptionEn,
    category,
    executionType,
    implementationStatus,
    lifecycle,
    visibility,
    availability,
    featureFlags,
    inputSchema,
    outputSchema,
    estimatedMinutes,
    tags,
    iconAssetId,
    supportedLocales,
    launchOrder: tool.launchOrder,
    currentVersion: { semanticVersion: tool.currentVersion.semanticVersion },
  };
}
