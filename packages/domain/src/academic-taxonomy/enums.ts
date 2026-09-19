export enum AcademicTaxonomyNodeType {
  ACADEMIC_FIELD = 'ACADEMIC_FIELD',
  DISCIPLINE = 'DISCIPLINE',
  PROGRAM_AREA = 'PROGRAM_AREA',
  SPECIALIZATION_CATEGORY = 'SPECIALIZATION_CATEGORY',
  STANDARD_CLASSIFICATION = 'STANDARD_CLASSIFICATION',
}

export enum AcademicTaxonomyStatus {
  DRAFT = 'DRAFT',
  READY_TO_REVIEW = 'READY_TO_REVIEW',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum AcademicStandardType {
  ISCED = 'ISCED',
  CIP = 'CIP',
  CUSTOM_NATIONAL = 'CUSTOM_NATIONAL',
}

export enum AcademicMappingStrength {
  EXACT = 'EXACT',
  BROAD = 'BROAD',
  NARROW = 'NARROW',
  RELATED = 'RELATED',
  UNKNOWN = 'UNKNOWN',
}

export enum AcademicTaxonomyValidationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}
