import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const live = read('apps/web/src/features/public-template/publicLiveDataSource.ts');
const scholarship = read('apps/web/src/features/public-template/publicScholarshipDataSource.ts');
const types = read('apps/web/src/features/public-template/types.ts');
const app = read('apps/web/src/features/public-template/PublicTemplateApp.tsx');
const universities = read('apps/web/src/features/public-template/components/UniversitiesList.tsx');
const provenance = read('docs/remediation/W4_PUBLIC_FACT_PROVENANCE.md');
const forbidden = [
  'scholarshipCount: 0', "acceptanceRate: ''", 'averageScholarships: 0', "futureDemand: 'متوسط'",
  'lessonsCount: 0', 'rating: 0', 'studentsCount: 0', 'scholarshipsCount: 0', 'universitiesCount: 0',
];
const checks = [
  ['no synthetic live public defaults', forbidden.every((token) => !live.includes(token))],
  ['unknown university facts are nullable', live.includes('scholarshipCount: null') && live.includes('acceptanceRate: null') && live.includes('return null;')],
  ['unknown major facts are nullable', live.includes('averageScholarships: null') && live.includes('futureDemand: null')],
  ['unknown course metrics are nullable', live.includes('lessonsCount: null') && live.includes('rating: null') && live.includes('studentsCount: null')],
  ['country relationship counts do not start at zero', live.includes('scholarshipsCount: null') && live.includes('universitiesCount: null')],
  ['without IELTS unknown is not fabricated false', scholarship.includes('withoutIelts: null') && !scholarship.includes('withoutIelts: false')],
  ['without IELTS filter requires explicit proof', app.includes('s.withoutIelts === true')],
  ['public DTO presentation contracts represent unknown', types.includes('withoutIelts: boolean | null') && types.includes('globalRank: number | null') && types.includes('averageScholarships: number | null')],
  ['university UI labels unavailable facts', universities.includes('الترتيب: غير متوفر') && universities.includes('نسبة القبول: {uni.acceptanceRate ??')],
  ['provenance classification recorded', provenance.includes('owner-derived') && provenance.includes('unsupported') && provenance.includes('relationship-derived')],
];
let failures=0; for (const [n,ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${n}`); if(!ok) failures++; }
console.log(`W4_PUBLIC_FACTS ${checks.length-failures}/${checks.length}`); if(failures) process.exit(1);
