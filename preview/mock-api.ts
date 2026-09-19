import { loadPublicPrototypeSnapshot } from '../apps/web/src/features/public-template/publicPrototypeDataSource';

const snapshot = loadPublicPrototypeSnapshot().data;
const updatedAt = '2026-09-08T00:00:00.000Z';
const lifecycle = { status: 'PUBLISHED', completenessStatus: 'COMPLETE', updatedAt };
const scholarships = snapshot.scholarships.map(item => ({
  ...item, ...lifecycle, displayName: item.title, sponsorName: item.university,
  providerName: item.university, studyCountry: item.country,
  applicationDeadline: item.deadline, isFullyFunded: true,
}));
const universities = snapshot.universities.map(item => ({
  ...item, ...lifecycle, displayName: item.name, foundedYear: item.foundationYear,
}));
const majors = snapshot.majors.map(item => ({
  ...item, ...lifecycle, displayName: item.name, degreeLevel: 'BACHELOR',
  academicFieldOrDiscipline: item.category, collegeOrFaculty: item.category,
}));
const courses = [...snapshot.courses, ...snapshot.paidCourses].map(item => ({
  ...item, ...lifecycle, displayName: item.title, originType: 'EXTERNAL',
  accessType: item.isFree ? 'FREE' : 'PAID', platformName: item.provider,
}));
const exams = snapshot.exams.map(item => ({ ...item, ...lifecycle, displayName: item.name }));
const catalogs: Record<string, Array<Record<string, unknown>>> = {
  '/admin/scholarships': scholarships,
  '/admin/universities': universities,
  '/admin/majors': majors,
  '/admin/courses': courses,
  '/admin/international-tests': exams,
};

function paginate(items: Array<Record<string, unknown>>, url: URL) {
  const query = (url.searchParams.get('search') || '').toLowerCase();
  const status = url.searchParams.get('status');
  const filtered = items.filter(item =>
    (!status || item.status === status) &&
    (!query || JSON.stringify(item).toLowerCase().includes(query)));
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.max(1, Number(url.searchParams.get('pageSize')) || 20);
  return { data: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length, page, pageSize, totalPages: Math.ceil(filtered.length / pageSize) };
}

function readPreview(url: URL): unknown {
  const path = url.pathname.replace(/^\/api\/v1/, '');
  if (path === '/admin/scholarships/summary') {
    return { all: scholarships.length, published: scholarships.length, imported: 0,
      missingFields: 0, needsVerification: 0, needsTranslation: 0, readyToPublish: 0, archived: 0 };
  }
  if (path === '/admin/majors/facets/colleges') return { data: [] };
  if (path === '/admin/majors/new-candidates') return paginate([], url);
  if (path.endsWith('/catalog-detail')) {
    const id = path.split('/').at(-2);
    const scholarship = scholarships.find(item => item.id === id);
    return { scholarship, completeness: { state: 'COMPLETE', missingFields: [],
      identityMissingFields: [], coreMissingFields: [], optionalMissingFields: [],
      missingCount: 0, identityReady: true }, unresolvedLinks: [], history: [], historyAvailable: false };
  }
  if (path === '/admin/courses/imported') {
    return { ...paginate([], url), overview: { total: 0, review: 0, incomplete: 0,
      broken: 0, needsVerification: 0, ready: 0, published: 0, archived: 0 } };
  }
  for (const [base, rows] of Object.entries(catalogs)) {
    if (path === base) return paginate(rows, url);
    if (path.startsWith(base + '/')) {
      const parts = path.slice(base.length + 1).split('/');
      if (parts.length > 1) return [];
      return rows.find(item => item.id === decodeURIComponent(parts[0])) ?? paginate([], url);
    }
  }
  if (path === '/admin/imports/batches') return [];
  if (path === '/admin/identities') return { data: { items: [], total: 0 } };
  if (path.startsWith('/monitoring/')) return {
    status: 'UNKNOWN', indicators: {}, blockerCount: 0, warningCount: 0, preview: true,
  };
  if (path === '/admin/finance/overview') return {
    pendingPayments: 0,
    pendingTransfers: 0,
    pendingApprovals: 0,
    reconciliationHealth: 'UNKNOWN',
    preview: true,
  };
  if (path.includes('navigation')) return { data: [], menus: [] };
  if (path.includes('settings')) return { data: [] };
  return paginate([], url);
}

export function installPreviewApi() {
  const nativeFetch = window.fetch.bind(window);
  const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const address = input instanceof Request ? input.url : String(input);
    const url = new URL(address, location.origin);
    if (!url.pathname.startsWith('/api/')) return nativeFetch(input, init);
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return Response.json({ error: 'نسخة تصميم فقط — العمليات الحقيقية غير متاحة.' }, { status: 423 });
    }
    return Response.json(readPreview(url));
  };

  try {
    window.fetch = mockFetch;
  } catch {
    try {
      Object.defineProperty(window, 'fetch', {
        value: mockFetch,
        configurable: true,
        writable: true,
      });
    } catch {
      // Ignore if fetch cannot be redefined
    }
  }
}
