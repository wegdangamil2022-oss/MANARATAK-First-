import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const live=read('apps/web/src/features/public-template/publicLiveDataSource.ts');
const scholarships=read('apps/web/src/features/public-template/publicScholarshipDataSource.ts');
const search=read('apps/web/src/features/public-template/components/GlobalSearchPage.tsx');
const nav=read('apps/web/src/features/public-template/usePublicNavigation.ts');
const api=read('apps/api/src/presentation/api/router/SearchRouter.ts');
const checks=[
 ['cursor-collector', live.includes('collectCursorPages') && live.includes('PUBLIC_CURSOR_DID_NOT_ADVANCE')],
 ['offset-collector-exhaustive-small-catalogs', live.includes('collectOffsetPages') && live.includes('pageNumber >= totalPages')],
 ['large-catalogs-use-cursors', ['getUniversities','getMajors','getCourses','getServices','getCareerJobs','getScholarships'].every(n=>live.includes(`${n}({`) && live.includes('cursor, limit: 100'))],
 ['scholarships-exhaust-cursor', scholarships.includes('for (let guard = 0; guard < 10000') && scholarships.includes('page.nextCursor')],
 ['global-search-api', api.includes("'/public'") && /searchPublic/.test(api)],
 ['web-global-search-server', search.includes('searchPublicCatalog') && search.includes('nextCursor') && search.includes('executeServerSearch(nextCursor, true)')],
 ['prototype-is-explicit', search.includes("searchMode === 'prototype'") && search.includes("searchMode === 'api'" )],
 ['canonical-search-query', nav.includes("params.set('q', state.globalSearchQuery.trim())") && nav.includes("path === '/search'" )],
 ['no-fixed-first-page-large-catalog', !/get(?:Universities|Majors|Courses|Services|CareerJobs|Scholarships)\(\{[^}]*page\s*:\s*1/s.test(live)],
];
let pass=0; for(const [name,ok] of checks){ console.log(`${ok?'PASS':'FAIL'} ${name}`); if(ok)pass++; }
console.log(`W4_PUBLIC_PAGINATION_SEARCH=${pass===checks.length?'PASS':'FAIL'} ${pass}/${checks.length}`);
process.exitCode=pass===checks.length?0:1;
