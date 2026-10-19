import type { Scholarship, University, Course, ImportedCourse, Major, ApplicationMilestone, PushNotificationItem, Exam, CountryDestination } from '../types';
// Clean handoff: no demonstration or live academic catalogs, student records or alerts.
export const INITIAL_SCHOLARSHIPS: Scholarship[] = [];
export const MOCK_UNIVERSITIES: University[] = [];
export const GOLDEN_IMPORTED_COURSES: ImportedCourse[] = [];
/** @deprecated: no sample entity is supplied; do not render this without actual owner data. */
export const GOLDEN_IMPORTED_COURSE: ImportedCourse = undefined as unknown as ImportedCourse;
export const MANARATAK_NATIVE_COURSES: Course[] = [];
export const MOCK_COURSES: Course[] = [];
export const MOCK_MAJORS: Major[] = [];
export const INITIAL_MILESTONES: ApplicationMilestone[] = [];
export const INITIAL_NOTIFICATIONS: PushNotificationItem[] = [];
export const MOCK_EXAMS: Exam[] = [];
export const MOCK_COUNTRIES: CountryDestination[] = [];
