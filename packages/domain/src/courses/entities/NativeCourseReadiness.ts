export type NativeCourseReadinessState = 'COMPLETE' | 'INCOMPLETE' | 'OPTIONAL';

export interface NativeCourseReadinessCheckDto {
  key: string;
  label: string;
  state: NativeCourseReadinessState;
  message?: string;
  targetSection?: 'basics' | 'curriculum' | 'assessments' | 'relationships' | 'completion' | 'enrollment' | 'settings';
}

export interface NativeCourseReadinessDto {
  ready: boolean;
  percentage: number;
  checks: NativeCourseReadinessCheckDto[];
}

export interface CreateNativeCourseDto {
  titleAr: string;
  accessType?: 'FREE_STUDY' | 'FREE_CERTIFICATE' | 'FREE_STUDY_AND_CERTIFICATE' | 'PAID';
  titleEn?: string;
  learningLanguage?: string;
  category?: string;
  difficultyLevel?: string;
}
