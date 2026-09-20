export interface IErrorLogger {
  logError(error: Error, context?: Record<string, unknown>): void;
}
