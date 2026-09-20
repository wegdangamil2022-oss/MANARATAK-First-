import fs from 'node:fs';
const files=['apps/web/src/i18n/ar.ts','apps/admin/src/i18n/ar.ts'];
const approved=new Set(['MANARATAK','React','SQL','IELTS','ETS','Coursera','edX','CSV','JSON','Phase','Source','Runtime','Migration','Canonical','Google','Studio','VITE_ADMIN_URL','CIP','ISCED','AI','CMS','RTL','LTR','MNR','ABC123','Finance','Excel','API','URL','ID','Slug','Tokens','College','Board','Cambridge','apps','admin','manaratak','csv','json','fallback','Source-only']);
const findings=[];
for(const file of files){
  const src=fs.readFileSync(file,'utf8');
  for(const [index,line] of src.split(/\r?\n/).entries()){
    const m=line.match(/^\s*"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,?\s*$/); if(!m) continue;
    const value=m[2].replaceAll('&lt;','');
    if(!/[\u0600-\u06FF]/u.test(value)) continue;
    const words=(value.match(/[A-Za-z][A-Za-z0-9_.@-]*/g)||[]).map(w=>w.replace(/[.]+$/,'')).filter(w=>!approved.has(w) && !/^[A-Z0-9_.@-]+$/.test(w) && !w.includes('@') && !/^https?/i.test(w));
    if(words.length) findings.push({file,line:index+1,key:m[1],words,value});
  }
}
if(findings.length){ for(const f of findings.slice(0,80)) console.log(`FAIL ${f.file}:${f.line} ${f.key} -> ${f.words.join(', ')} :: ${f.value}`); }
else console.log('PASS arabic-values-no-accidental-english-prose');
const web=fs.readFileSync(files[0],'utf8'), admin=fs.readFileSync(files[1],'utf8');
const representative=['view_service','browse_manaratak_student_document_visa_travel_acad','explore_manaratak_student_tools_checklists_assista','manage_service_catalog_items_readiness_publication'];
const reps=representative.every(k=>new RegExp(`"${k}"\\s*:\\s*"[^"A-Za-z]*(?:MANARATAK)?[^"a-z]*"`).test(web) && new RegExp(`"${k}"\\s*:\\s*"[^"A-Za-z]*(?:MANARATAK)?[^"a-z]*"`).test(admin));
console.log(`${reps?'PASS':'FAIL'} representative-arabic-copy`);
console.log(`ARABIC_SEMANTIC_COPY=${findings.length===0&&reps?'PASS':'FAIL'} findings=${findings.length}`);
process.exitCode=findings.length===0&&reps?0:1;
