export interface ILogContext {
  getCorrelationId(): string | undefined;
  runWithContext<T>(correlationId: string, callback: () => T): T;
}
