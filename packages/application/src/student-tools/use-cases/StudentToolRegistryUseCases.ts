import { AssetReferencePolicy, assertAssetReferenceUsable } from '../../asset-platform/AssetReferencePolicy';
import {
  IStudentToolRegistryRepository,
  IStudentToolDependencyHealthGateway,
  StudentToolActivationReadinessService,
  StudentToolDefinition,
  StudentToolHealthService,
  StudentToolFilters,
  StudentToolImplementationStatus,
  StudentToolLifecycleStatus,
  StudentToolVisibilityStatus,
  StudentToolPublicAccessPolicy,
} from '@manaratak/domain';
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
    if (!actorReferenceId) throw new Error('ACTOR_REQUIRED');
    const values = [];
    for (const tool of OFFICIAL_STUDENT_TOOLS)
      values.push(await this.repository.upsertDefinition(tool, actorReferenceId));
    return values;
  }
  listAdminTools(filters: StudentToolFilters = {}) {
    return this.repository.list(filters);
  }
  async listPublicTools(filters: StudentToolFilters = {}) {
    const tools = await this.repository.listPublic(filters);
    return tools.filter(StudentToolPublicAccessPolicy.isDiscoverable);
  }
  findTool(toolKey: string) {
    return this.repository.findByKey(toolKey);
  }
  async findPublicTool(toolKey: string) {
    const tool = await this.repository.findByKey(toolKey);
    return tool && StudentToolPublicAccessPolicy.isDiscoverable(tool) ? tool : null;
  }
  telemetry(toolKey?: string) {
    return this.repository.telemetry(toolKey);
  }
  executions(toolKey: string, page?: number, pageSize?: number) {
    return this.repository.listExecutions(toolKey, page, pageSize);
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
  async update(toolKey: string, patch: Record<string, unknown>, actorReferenceId: string) {
    if (typeof patch.iconAssetId === 'string' || patch.iconAssetId === null) {
      await assertAssetReferenceUsable(this.assetReferences, patch.iconAssetId as string | null, { purpose: 'STUDENT_TOOL_ICON' });
    }
    if (['toolKey', 'id', 'createdAt'].some((key) => key in patch))
      throw new Error('IMMUTABLE_TOOL_IDENTITY');
    const current = await this.repository.findByKey(toolKey);
    if (!current) throw new Error('TOOL_NOT_FOUND');
    const versionedFields = ['availability', 'rateLimitPolicy', 'aiCapabilityKey', 'executionType', 'outputType', 'supportedLocales', 'inputSchema', 'outputSchema', 'dependencies'];
    if (versionedFields.some((field) => field in patch)) throw new Error('TOOL_VERSION_INCREMENT_REQUIRED');
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
    );
  }
  async updateVersionedConfiguration(
    toolKey: string,
    patch: Partial<StudentToolDefinition>,
    version: { semanticVersion: string; changeNote: string },
    actorReferenceId: string,
  ) {
    const current = await this.repository.findByKey(toolKey);
    if (!current) throw new Error('TOOL_NOT_FOUND');
    if (!/^\d+\.\d+\.\d+$/.test(version.semanticVersion)) throw new Error('INVALID_TOOL_SEMANTIC_VERSION');
    if (compareSemver(version.semanticVersion, current.currentVersion.semanticVersion) <= 0)
      throw new Error('TOOL_VERSION_MUST_INCREMENT');
    if (!version.changeNote.trim()) throw new Error('TOOL_VERSION_CHANGE_NOTE_REQUIRED');
    const next: StudentToolDefinition = {
      ...current,
      ...patch,
      toolKey: current.toolKey,
      dependencies: patch.dependencies ?? current.dependencies,
      inputSchema: patch.inputSchema ?? current.inputSchema,
      outputSchema: patch.outputSchema ?? current.outputSchema,
      currentVersion: {
        semanticVersion: version.semanticVersion,
        inputSchemaVersion: (patch.inputSchema ?? current.inputSchema).version,
        outputSchemaVersion: (patch.outputSchema ?? current.outputSchema).version,
        releaseDate: new Date(),
        changeNote: version.changeNote.trim(),
        status: 'ACTIVE',
      },
    };
    return this.repository.upsertDefinition(next, actorReferenceId);
  }

  async transition(
    toolKey: string,
    lifecycle: StudentToolLifecycleStatus,
    actorReferenceId: string,
  ) {
    const tool = await this.repository.findByKey(toolKey);
    if (!tool) throw new Error('TOOL_NOT_FOUND');
    if (
      lifecycle === StudentToolLifecycleStatus.ACTIVE &&
      tool.implementationStatus !== StudentToolImplementationStatus.IMPLEMENTED
    )
      throw new Error('TOOL_NOT_IMPLEMENTED');
    if (lifecycle === StudentToolLifecycleStatus.ACTIVE) {
      const readiness = await this.readinessService.evaluate(tool);
      if (!readiness.ready) throw new Error(`TOOL_NOT_READY:${readiness.blockers.join(',')}`);
    }
    const visibility =
      lifecycle === StudentToolLifecycleStatus.ACTIVE
        ? StudentToolVisibilityStatus.ACTIVE
        : lifecycle === StudentToolLifecycleStatus.RETIRED
          ? StudentToolVisibilityStatus.RETIRED
          : tool.visibility;
    return this.repository.updateDefinition(
      toolKey,
      { lifecycle, visibility },
      actorReferenceId,
      `STUDENT_TOOL_${lifecycle}`,
    );
  }
}

function compareSemver(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}
