export interface CourseEnrollmentPolicyDto {
  courseId: string;
  isCapacityLimited: boolean;
  maximumSeats?: number | null;
  requiresApproval: boolean;
  waitlistEnabled: boolean;
  prerequisiteCourseIds: string[];
  eligibilityRules?: Record<string, unknown> | null;
  requiresFinancialClearance: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertCourseEnrollmentPolicyDto {
  courseId: string;
  isCapacityLimited?: boolean;
  maximumSeats?: number | null;
  requiresApproval?: boolean;
  waitlistEnabled?: boolean;
  prerequisiteCourseIds?: string[];
  eligibilityRules?: Record<string, unknown> | null;
  requiresFinancialClearance?: boolean;
}
