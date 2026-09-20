import { ApiResponse, ApiMetadata, ApiError, PaginationMeta } from '@manaratak/core';

export class ResponseFormatter {
  constructor(private readonly version: string = 'v1') {}

  public success<T>(data: T, requestId?: string, pagination?: PaginationMeta): ApiResponse<T> {
    return {
      data,
      meta: this.createMetadata(requestId, pagination)
    };
  }

  public error(error: ApiError, requestId?: string): ApiResponse<null> {
    return {
      data: null,
      error,
      meta: this.createMetadata(requestId)
    };
  }

  private createMetadata(requestId?: string, pagination?: PaginationMeta): ApiMetadata {
    return {
      timestamp: new Date().toISOString(),
      version: this.version,
      requestId,
      pagination
    };
  }
}
