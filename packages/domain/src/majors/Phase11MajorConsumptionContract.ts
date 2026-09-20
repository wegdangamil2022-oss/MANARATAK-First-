/** Phase 10 handoff contract. Phase 11 stores references; it does not own Major or taxonomy identity. */
export interface Phase11AcademicProgramMajorReference {
  academicProgramId?: string;
  sourceProgramName: string;
  majorId?: string;
  degreeLevelId?: string;
  status: 'MATCHED' | 'AMBIGUOUS' | 'MAJOR_REVIEW_REQUIRED' | 'UNMAPPED';
}

export interface Phase11MajorConsumptionDecision {
  acceptable: boolean;
  blockingCode?:
    | 'CANONICAL_MAJOR_ID_REQUIRED'
    | 'CANONICAL_DEGREE_LEVEL_ID_REQUIRED'
    | 'UNRESOLVED_PROGRAM_STATUS_REQUIRED';
  createsMajorIdentity: false;
  createsTaxonomyIdentity: false;
}

export class Phase11MajorConsumptionContract {
  static validate(reference: Phase11AcademicProgramMajorReference): Phase11MajorConsumptionDecision {
    if (reference.status === 'MATCHED' && !reference.majorId?.trim()) {
      return this.blocked('CANONICAL_MAJOR_ID_REQUIRED');
    }
    if (reference.status === 'MATCHED' && !reference.degreeLevelId?.trim()) {
      return this.blocked('CANONICAL_DEGREE_LEVEL_ID_REQUIRED');
    }
    if (reference.status === 'AMBIGUOUS' && reference.majorId) {
      return this.blocked('UNRESOLVED_PROGRAM_STATUS_REQUIRED');
    }
    return {
      acceptable: true,
      createsMajorIdentity: false,
      createsTaxonomyIdentity: false,
    };
  }

  private static blocked(blockingCode: NonNullable<Phase11MajorConsumptionDecision['blockingCode']>): Phase11MajorConsumptionDecision {
    return {
      acceptable: false,
      blockingCode,
      createsMajorIdentity: false,
      createsTaxonomyIdentity: false,
    };
  }
}
