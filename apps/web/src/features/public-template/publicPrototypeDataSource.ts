/**
 * Explicit prototype-only adapter. This module is loaded dynamically only when
 * VITE_PUBLIC_TEMPLATE_DATA_MODE=prototype. Production/live composition never imports it.
 */
import { INITIAL_SCHOLARSHIPS, MOCK_UNIVERSITIES, MOCK_COURSES, MOCK_MAJORS, MOCK_EXAMS, MOCK_COUNTRIES, GOLDEN_IMPORTED_COURSES, MANARATAK_NATIVE_COURSES } from './data/mockData';
import { GOLDEN_ARTICLES, ARTICLE_PREVIEWS, type ArticlePreviewRecord } from './data/articleData';
import type { PublicArticle } from './types';
import { PUBLIC_SERVICES } from './data/serviceData';
import { STUDENT_TOOLS_PREVIEW } from './data/studentToolsData';
import type { PublicLiveLoadResult } from './publicLiveDataSource';

/**
 * Additional editorial design cards are strictly prototype fixtures.
 * Their detail pages clearly disclose that the complete article has not been
 * published. Live/API content must never consume these synthetic records.
 */
const PROTOTYPE_ARTICLE_RECORDS: ArticlePreviewRecord[] = [
  ...ARTICLE_PREVIEWS.filter((record) => !GOLDEN_ARTICLES.some((article) => article.id === record.id)),
  {
    id: 'art_106',
    titleAr: 'أفضل أدوات الذكاء الاصطناعي لتنظيم البحث الأكاديمي',
    titleEn: 'AI Tools for Organizing Academic Research',
    contentType: 'ARTICLE' as const,
    contentTypeLabelAr: 'مقال تحريري',
    categoryAr: 'أدوات البحث',
    author: 'فريق منارتك',
    updatedAt: '2026',
  },
];
const PROTOTYPE_ARTICLES: PublicArticle[] = PROTOTYPE_ARTICLE_RECORDS.map((record): PublicArticle => ({
  id: record.id,
  slug: `preview-${record.id.replace(/[^a-zA-Z0-9-]/g, '-')}`,
  titleAr: record.titleAr,
  titleEn: record.titleEn,
  contentType: record.contentType,
  contentTypeLabelAr: record.contentTypeLabelAr,
  categoryAr: record.categoryAr,
  author: record.author,
  updatedAt: record.updatedAt,
  readingTime: '4 دقائق',
  excerptAr: record.excerptAr || 'هذا نموذج لبطاقة مقال ضمن معاينة تصميم منارتك. المحتوى التفصيلي لم يُنشر بعد.',
  sections: [{
    title: 'معاينة تصميم المقال',
    paragraphs: ['هذه صفحة تجريبية لاستعراض شكل المقال وعناصره داخل منارتك. لا تتضمن هذه المعاينة مقالًا منشورًا أو إرشادات رسمية.'],
  }],
}));

export function loadPublicPrototypeSnapshot(): PublicLiveLoadResult {
  return {
    data: {
      scholarships: INITIAL_SCHOLARSHIPS,
      universities: MOCK_UNIVERSITIES,
      majors: MOCK_MAJORS,
      countries: MOCK_COUNTRIES,
      exams: MOCK_EXAMS,
      courses: [...MANARATAK_NATIVE_COURSES, ...MOCK_COURSES.filter((course) => course.isFree && !MANARATAK_NATIVE_COURSES.some((native) => native.id === course.id))],
      paidCourses: MOCK_COURSES.filter((course) => !course.isFree),
      importedCourses: GOLDEN_IMPORTED_COURSES,
      articles: [...GOLDEN_ARTICLES, ...PROTOTYPE_ARTICLES],
      services: PUBLIC_SERVICES,
      careers: [],
      tools: STUDENT_TOOLS_PREVIEW,
    },
    statuses: { scholarships: 'ready', universities: 'ready', majors: 'ready', countries: 'ready', exams: 'ready', courses: 'ready', articles: 'ready', services: 'ready', careers: 'ready', tools: 'ready' },
    errors: {},
  };
}
