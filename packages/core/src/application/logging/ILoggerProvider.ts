import { LogLevel } from './LogLevel';

export interface StructuredLogMessage {
  timestamp: string;
  level: LogLevel;
  correlationId?: string;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
}

export interface ILoggerProvider {
  log(message: StructuredLogMessage): void;
}
