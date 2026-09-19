/**
 * Explicit prototype-only adapter. This module is loaded dynamically only when
 * VITE_PUBLIC_TEMPLATE_DATA_MODE=prototype. Production/live composition never imports it.
 */
import { INITIAL_SCHOLARSHIPS, MOCK_UNIVERSITIES, MOCK_COURSES, MOCK_MAJORS, MOCK_EXAMS, MOCK_COUNTRIES, GOLDEN_IMPORTED_COURSES } from './data/mockData';
import { GOLDEN_ARTICLES } from './data/articleData';
import { PUBLIC_SERVICES } from './data/serviceData';
import { STUDENT_TOOLS_PREVIEW } from './data/studentToolsData';
import type { PublicLiveLoadResult } from './publicLiveDataSource';

export function loadPublicPrototypeSnapshot(): PublicLiveLoadResult {
  return {
    data: {
      scholarships: INITIAL_SCHOLARSHIPS,
      universities: MOCK_UNIVERSITIES,
      majors: MOCK_MAJORS,
      countries: MOCK_COUNTRIES,
      exams: MOCK_EXAMS,
      courses: MOCK_COURSES.filter((course) => course.isFree),
      paidCourses: MOCK_COURSES.filter((course) => !course.isFree),
      importedCourses: GOLDEN_IMPORTED_COURSES,
      articles: GOLDEN_ARTICLES,
      services: PUBLIC_SERVICES,
      careers: [],
      tools: STUDENT_TOOLS_PREVIEW,
    },
    statuses: { scholarships: 'ready', universities: 'ready', majors: 'ready', countries: 'ready', exams: 'ready', courses: 'ready', articles: 'ready', services: 'ready', careers: 'ready', tools: 'ready' },
    errors: {},
  };
}
