import { ReferenceDataValidationIssue } from '@manaratak/domain';

export class ReferenceDataValidationError extends Error {
  public readonly code = 'REFERENCE_DATA_VALIDATION_FAILED';

  constructor(
    public readonly entityType: string,
    public readonly issues: readonly ReferenceDataValidationIssue[],
  ) {
    super(`${entityType} canonical validation failed`);
    this.name = 'ReferenceDataValidationError';
  }
}

export class ReferenceDataNotFoundError extends Error {
  public readonly code = 'REFERENCE_DATA_NOT_FOUND';

  constructor(
    public readonly entityType: string,
    public readonly reference: string,
  ) {
    const label = entityType
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    super(`${label} not found: ${reference}`);
    this.name = 'ReferenceDataNotFoundError';
  }
}

export class ReferenceDataInvariantError extends Error {
  public readonly code = 'REFERENCE_DATA_INVARIANT_VIOLATION';

  constructor(message: string) {
    super(message);
    this.name = 'ReferenceDataInvariantError';
  }
}
