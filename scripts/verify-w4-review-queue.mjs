import fs from 'node:fs'; const s=fs.readFileSync('apps/admin/src/pages/AdminReviewQueuePage.tsx','utf8');
const checks=[];
checks.push(['generic-exhaustive-loader', s.includes('async function safeListAll') && s.includes('for (let page = 1; page <= 10000')]);
checks.push(['reason-queries-use-all-pages', s.includes('const records = await safeListAll(endpoint, query)')]);
checks.push(['import-course-verification-exhaustive', s.includes("safeListAll('/admin/courses/imported', {})")]);
checks.push(['scholarship-import-exhaustive', s.includes('rows.push(...batch)') && s.includes('sourceTotal') && s.includes('pageSize = 100')]);
checks.push(['no-fixed-actionable-samples', !/safeList\([^\n]+page:\s*'1'[^\n]+pageSize:\s*'(20|40|50)'/.test(s)]);
checks.push(['queue-labelled-exhaustive', s.includes('exhausts all available source pages')]);
let pass=0;for(const[n,ok]of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(ok)pass++;}console.log(`W4_REVIEW_QUEUE=${pass===checks.length?'PASS':'FAIL'} ${pass}/${checks.length}`);process.exitCode=pass===checks.length?0:1;
