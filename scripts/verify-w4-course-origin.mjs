import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const data=read('apps/web/src/features/public-template/publicLiveDataSource.ts');
const app=read('apps/web/src/features/public-template/PublicTemplateApp.tsx');
const nav=read('apps/web/src/features/public-template/usePublicNavigation.ts');
const track=read('apps/web/src/features/public-template/components/CourseTrackPreview.tsx');
const detail=read('apps/web/src/features/public-template/components/OwnerCourseDetail.tsx');
const checks=[];
checks.push(['authoritative-classifier', data.includes("dto.accessType === 'PAID'") && data.includes("dto.originType === 'NATIVE_MANARATAK_COURSE'")]);
checks.push(['native-not-imported', data.includes("const imported: ImportedCourse | null = track === 'imported'")]);
checks.push(['separate-native-paid-imported-collections', data.includes("track === 'native'") && data.includes("track === 'paid'") && data.includes('paidCourses')]);
checks.push(['deep-link-classifies', app.includes('mapped.track') && app.includes("selectedCourseTrack: mapped.track")]);
checks.push(['owner-course-state', nav.includes('selectedCourse: null as Course | null') && app.includes("navigation.field('selectedCourse')")]);
checks.push(['native-paid-owner-catalog', track.includes('courses: Course[]') && !track.includes('onImported')]);
checks.push(['owner-detail-not-imported-detail', app.includes('<OwnerCourseDetail') && detail.includes("track: 'native' | 'paid'")]);
checks.push(['imported-catalog-remains-separated', app.includes('<CoursesSearchPage') && app.includes('importedCourses={importedCourses}')]);
let pass=0;for(const[n,ok]of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(ok)pass++;}
console.log(`W4_COURSE_ORIGIN=${pass===checks.length?'PASS':'FAIL'} ${pass}/${checks.length}`);process.exitCode=pass===checks.length?0:1;
