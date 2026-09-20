export enum ReferenceDataValidationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR'
}

export interface ReferenceDataValidationIssue {
  fieldName?: string;
  code: string;
  message: string;
  severity: ReferenceDataValidationSeverity;
}

export interface ReferenceDataCompletenessReport {
  entityType: 'COUNTRY' | 'CURRENCY' | 'LANGUAGE' | 'CITY';
  deterministicKey: string;
  requiredFields: string[];
  presentFields: string[];
  missingFields: string[];
  issues: ReferenceDataValidationIssue[];
  isComplete: boolean;
  canBeImported: boolean;
}
