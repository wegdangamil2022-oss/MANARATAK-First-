import { IStudentToolHandler, IStudentToolDependencyHealthGateway, IStudentToolResultProtector } from './contracts';
import { StudentToolDefinition, StudentToolHealthStatus, StudentToolImplementationStatus, StudentToolLifecycleStatus, StudentToolVisibilityStatus } from './types';
export class StudentToolHandlerRegistry {
  private readonly handlers = new Map<string, IStudentToolHandler>();
  private readonly versions = new Map<string, IStudentToolHandler>();
  constructor(handlers: IStudentToolHandler[]) {
    for (const handler of handlers) {
      const key = `${handler.toolKey}:${handler.contract?.inputSchema.version}:${handler.contract?.outputSchema.version}`;
      if (this.versions.has(key)) throw new Error('DUPLICATE_STUDENT_TOOL_HANDLER');
      this.versions.set(key, handler);
      this.handlers.set(handler.toolKey, handler);
    }
  }
  get(key: string) {
    return this.handlers.get(key) ?? null;
  }
  getVersion(key: string, version: string) {
    return this.versions.get(`${key}:${version}`) ?? null;
  }
  has(key: string) {
    return this.handlers.has(key);
  }
  list() {
    return [...this.handlers.values()];
  }
}
export class StudentToolActivationReadinessService { constructor(private readonly handlers: StudentToolHandlerRegistry, private readonly health: IStudentToolDependencyHealthGateway, private readonly resultProtector?: IStudentToolResultProtector) {}
  async evaluate(tool: StudentToolDefinition) {
    const blockers: string[] = []; if (tool.implementationStatus !== StudentToolImplementationStatus.IMPLEMENTED) blockers.push('TOOL_NOT_IMPLEMENTED');
    if (!this.handlers.has(tool.toolKey)) blockers.push('MISSING_IMPLEMENTATION_HANDLER');
    const handler = this.handlers.get(tool.toolKey);
    if (
      handler &&
      (!handler.contract ||
        JSON.stringify(handler.contract.inputSchema) !== JSON.stringify(tool.inputSchema) ||
        JSON.stringify(handler.contract.outputSchema) !== JSON.stringify(tool.outputSchema))
    )
      blockers.push('TOOL_HANDLER_SCHEMA_MISMATCH');
    if (
      tool.implementationStatus === StudentToolImplementationStatus.IMPLEMENTED &&
      this.resultProtector &&
      this.resultProtector.status() !== 'READY'
    )
      blockers.push('TOOL_RESULT_PROTECTION_NOT_CONFIGURED');
    if (!tool.inputSchema.fields.length || !tool.outputSchema.fields.length)
      blockers.push('INVALID_TOOL_SCHEMA');
    if (tool.availability.adminOnly && tool.availability.publicEnabled)
      blockers.push('CONFLICTING_AVAILABILITY_FLAGS');
    if (
      !tool.rateLimitPolicy ||
      Object.values(tool.rateLimitPolicy).some((value) => !Number.isInteger(value) || value < 1)
    )
      blockers.push('INVALID_RATE_LIMIT_POLICY');
    if (!tool.featureFlags.globallyEnabled) blockers.push('TOOL_GLOBALLY_DISABLED'); for (const dependency of tool.dependencies.filter((item) => item.required)) { const status = await this.health.status(dependency); if (status !== 'READY') blockers.push(`${dependency.phase}_${status}`); }
    return { ready: blockers.length === 0, blockers };
  }
}
export class StudentToolHealthService { constructor(private readonly handlers: StudentToolHandlerRegistry, private readonly dependencies: IStudentToolDependencyHealthGateway, private readonly resultProtector?: IStudentToolResultProtector) {} async compute(tool: StudentToolDefinition): Promise<StudentToolHealthStatus> { if (tool.featureFlags.maintenanceMode) return StudentToolHealthStatus.MAINTENANCE; if (tool.implementationStatus !== StudentToolImplementationStatus.IMPLEMENTED || !this.handlers.has(tool.toolKey)) return StudentToolHealthStatus.NOT_CONFIGURED; if (this.resultProtector && this.resultProtector.status() !== 'READY') return StudentToolHealthStatus.NOT_CONFIGURED; if (tool.lifecycle === StudentToolLifecycleStatus.RETIRED || tool.visibility === StudentToolVisibilityStatus.DISABLED) return StudentToolHealthStatus.OFFLINE; const states = await Promise.all(tool.dependencies.filter((item) => item.required).map((item) => this.dependencies.status(item))); if (states.some((state) => state === 'UNAVAILABLE')) return StudentToolHealthStatus.OFFLINE; if (states.some((state) => state !== 'READY')) return StudentToolHealthStatus.DEGRADED; return StudentToolHealthStatus.HEALTHY; } }

/** Single source of truth for whether a Phase 18 tool may be advertised publicly. */
export class StudentToolPublicAccessPolicy {
  static isDiscoverable(tool: StudentToolDefinition): boolean {
    return (
      tool.implementationStatus === StudentToolImplementationStatus.IMPLEMENTED &&
      tool.lifecycle === StudentToolLifecycleStatus.ACTIVE &&
      tool.visibility === StudentToolVisibilityStatus.ACTIVE &&
      tool.availability.publicEnabled === true &&
      tool.availability.adminOnly !== true &&
      tool.availability.maintenanceMode !== true &&
      tool.featureFlags.globallyEnabled === true &&
      tool.featureFlags.maintenanceMode !== true
    );
  }

  static consumerBlockers(tool: StudentToolDefinition, consumerType: 'ANONYMOUS' | 'AUTHENTICATED_STUDENT', locale: string): string[] {
    const reasons: string[] = [];
    if (!this.isDiscoverable(tool)) reasons.push('FLAG_OR_LIFECYCLE_DISABLED');
    if (!tool.supportedLocales.includes(locale) || (tool.availability.allowedLocales.length && !tool.availability.allowedLocales.includes(locale))) reasons.push('LOCALE_DENIED');
    if (consumerType === 'ANONYMOUS' && (!tool.availability.anonymousEnabled || !tool.featureFlags.anonymousEnabled)) reasons.push('FLAG_DISABLED');
    if (consumerType === 'AUTHENTICATED_STUDENT' && (!tool.availability.authenticatedEnabled || !tool.featureFlags.authenticatedEnabled)) reasons.push('FLAG_DISABLED');
    if (tool.availability.allowedRegions.length) reasons.push('REGION_POLICY_UNAVAILABLE');
    return reasons;
  }

  static assertDiscoverable(tool: StudentToolDefinition): void {
    if (!this.isDiscoverable(tool)) throw new Error('TOOL_NOT_FOUND');
  }
}

/** Cheap global contract, applied before owner lookups, quotas and dependencies. */
export function assertBoundedStudentToolInput(value: unknown): void {
  let nodes = 0;
  const walk = (item: unknown, depth: number): void => {
    if (++nodes > 2000 || depth > 8) throw new Error('TOOL_INPUT_INVALID');
    if (typeof item === 'string' && item.length > 20000) throw new Error('TOOL_INPUT_INVALID');
    if (item && typeof item === 'object') {
      const entries = Object.entries(item);
      if (entries.length > 100) throw new Error('TOOL_INPUT_INVALID');
      for (const [key, child] of entries) {
        if (key.length > 120 || ['__proto__', 'constructor', 'prototype'].includes(key))
          throw new Error('TOOL_INPUT_INVALID');
        walk(child, depth + 1);
      }
    } else if (typeof item === 'number' && !Number.isFinite(item))
      throw new Error('TOOL_INPUT_INVALID');
  };
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('TOOL_INPUT_INVALID');
  walk(value, 0);
  if (JSON.stringify(value).length > 64000) throw new Error('TOOL_INPUT_INVALID');
}

/** Safe failure receipt: private prompts and provider messages are never attached. */
export class StudentToolAIExecutionError extends Error {
  readonly aiExecutionReference?: string;
  constructor(code: string, reference?: string) {
    super(code);
    if (reference && /^[A-Za-z0-9_-]{1,200}$/.test(reference)) this.aiExecutionReference = reference;
  }
}
