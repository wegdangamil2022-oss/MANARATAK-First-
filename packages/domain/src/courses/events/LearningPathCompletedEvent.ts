export const LEARNING_PATH_COMPLETED_EVENT_TYPE = 'LearningPathCompleted';
export const LEARNING_PATH_COMPLETED_EVENT_CATEGORY = 'LearningPlatform';
export const LEARNING_PATH_COMPLETED_EVENT_VERSION = '1.0.0';

export interface LearningPathCompletedEventPayload {
  learningPathId: string;
  studentReferenceId: string;
  completedAt: Date | string;
  eligibleForCertificate: boolean;
  certificateOwnerPhase: 'Phase 14 - Enterprise Certificates Platform';
  sourcePhase: 'Phase 13 - Learning Platform';
}
