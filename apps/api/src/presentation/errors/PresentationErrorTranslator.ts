import { ErrorCode, SerializedError, ApiResponse, ApiError } from '@manaratak/core';

export class PresentationErrorTranslator {
  public static translateToStatusCode(code: string): number {
    switch (code) {
      case ErrorCode.VALIDATION_ERROR:
        return 400;
      case ErrorCode.UNAUTHORIZED:
        return 401;
      case ErrorCode.FORBIDDEN:
        return 403;
      case ErrorCode.NOT_FOUND:
        return 404;
      case ErrorCode.CONFLICT:
        return 409;
      case ErrorCode.INFRASTRUCTURE_ERROR:
        return 503;
      case ErrorCode.UNEXPECTED_ERROR:
      default:
        return 500;
    }
  }

  public static formatResponse(serializedError: SerializedError, version: string = 'v1'): ApiResponse<null> {
    const error: ApiError = {
      code: serializedError.code,
      message: serializedError.message,
      details: serializedError.details,
      traceId: serializedError.traceId
    };

    return {
      data: null,
      error,
      meta: {
        timestamp: new Date().toISOString(),
        version: version,
        requestId: serializedError.traceId
      }
    };
  }
}
