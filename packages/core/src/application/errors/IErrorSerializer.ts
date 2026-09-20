export interface SerializedError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  traceId?: string;
}

export interface IErrorSerializer {
  serialize(error: Error | unknown, traceId?: string): SerializedError;
}
