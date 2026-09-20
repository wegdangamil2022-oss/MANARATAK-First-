import { ErrorCode } from '../domain/exceptions/ErrorCode';

export interface IResultError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class Result<T, E extends IResultError = IResultError> {
  public isSuccess: boolean;
  public isFailure: boolean;
  public error: E | null;
  private _value: T | null;

  protected constructor(isSuccess: boolean, error?: E | null, value?: T) {
    if (isSuccess && error) {
      throw new Error("InvalidOperation: A result cannot be successful and contain an error");
    }
    if (!isSuccess && !error) {
      throw new Error("InvalidOperation: A failing result needs to contain an error message");
    }
    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.error = error || null;
    this._value = value !== undefined ? value : null;
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error("Can't get the value of an error result. Use 'error' instead.");
    }
    return this._value as T;
  }

  public static ok<U>(value?: U): Result<U, any> {
    return new Result<U, any>(true, null, value);
  }

  public static fail<U, E extends IResultError = IResultError>(error: E): Result<U, E> {
    return new Result<U, E>(false, error);
  }
}

export class ResultFactory {
  public static success<T>(value?: T): Result<T> {
    return Result.ok(value);
  }

  public static failure<T>(message: string, code: string = ErrorCode.UNEXPECTED_ERROR, details?: Record<string, unknown>): Result<T> {
    return Result.fail({ code, message, details });
  }

  public static validationFailure<T>(message: string, errors: any[]): Result<T> {
    return Result.fail({ code: ErrorCode.VALIDATION_ERROR, message, details: { errors } });
  }
}
