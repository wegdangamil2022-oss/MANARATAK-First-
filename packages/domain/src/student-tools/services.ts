import { IStudentToolHandler, IStudentToolDependencyHealthGateway, IStudentToolResultProtector } from './contracts';
import { StudentToolDefinition, StudentToolHealthStatus, StudentToolImplementationStatus, StudentToolLifecycleStatus, StudentToolVisibilityStatus } from './types';
export class StudentToolHandlerRegistry { private readonly handlers: Map<string, IStudentToolHandler>; constructor(handlers: IStudentToolHandler[]) { this.handlers = new Map(handlers.map((handler) => [handler.toolKey, handler])); if (this.handlers.size !== handlers.length) throw new Error('DUPLICATE_STUDENT_TOOL_HANDLER'); } get(key: string) { return this.handlers.get(key) ?? null; } has(key: string) { return this.handlers.has(key); } list() { return [...this.handlers.values()]; } }
export class StudentToolActivationReadinessService { constructor(private readonly handlers: StudentToolHandlerRegistry, private readonly health: IStudentToolDependencyHealthGateway, private readonly resultProtector?: IStudentToolResultProtector) {} async evaluate(tool: StudentToolDefinition) { const blockers: string[] = []; if (tool.implementationStatus !== StudentToolImplementationStatus.IMPLEMENTED) blockers.push('TOOL_NOT_IMPLEMENTED'); if (!this.handlers.has(tool.toolKey)) blockers.push('MISSING_IMPLEMENTATION_HANDLER'); if (tool.implementationStatus === StudentToolImplementationStatus.IMPLEMENTED && this.resultProtector && this.resultProtector.status() !== 'READY') blockers.push('TOOL_RESULT_PROTECTION_NOT_CONFIGURED'); if (!tool.inputSchema.fields.length || !tool.outputSchema.fields.length) blockers.push('INVALID_TOOL_SCHEMA'); if (tool.availability.adminOnly && tool.availability.publicEnabled) blockers.push('CONFLICTING_AVAILABILITY_FLAGS'); if (!tool.rateLimitPolicy || Object.values(tool.rateLimitPolicy).some((value) => !Number.isInteger(value) || value < 1)) blockers.push('INVALID_RATE_LIMIT_POLICY'); if (!tool.featureFlags.globallyEnabled) blockers.push('TOOL_GLOBALLY_DISABLED'); for (const dependency of tool.dependencies.filter((item) => item.required)) { const status = await this.health.status(dependency); if (status !== 'READY') blockers.push(`${dependency.phase}_${status}`); } return { ready: blockers.length === 0, blockers }; } }
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

  static assertDiscoverable(tool: StudentToolDefinition): void {
    if (!this.isDiscoverable(tool)) throw new Error('TOOL_NOT_FOUND');
  }
}
