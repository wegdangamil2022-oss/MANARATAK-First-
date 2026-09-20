export enum ImportRecordStatus {
  PENDING='PENDING',
  VALID='VALID',
  COMPLETE='COMPLETE',
  INCOMPLETE='INCOMPLETE',
  NEEDS_REVIEW='NEEDS_REVIEW',
  PROMOTED='PROMOTED',
  FAILED='FAILED',
}

export interface ImportRecordDto {
  id?: string;
  status?: ImportRecordStatus;
  normalizedPayload?: Readonly<Record<string, unknown>> | unknown;
  rawPayload?: Readonly<Record<string, unknown>> | unknown;
  sourceReference?: string;
  batchId?: string;
  importSessionId?: string;
  metadata?: Readonly<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore?: boolean;
  nextCursor?: string | null;
}
