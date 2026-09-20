export interface IAuditLogger {
  logAudit(action: string, userId: string, resource: string, details?: Record<string, unknown>): void;
}
