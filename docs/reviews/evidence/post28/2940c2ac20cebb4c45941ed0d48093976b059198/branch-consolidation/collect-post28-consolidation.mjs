import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const sourceSha='2940c2ac20cebb4c45941ed0d48093976b059198';
const baseline='c7f6585dddc6d350291d81726b936eb2daa0e2c9';
const r05='61878b5b37b2109e37f55e554e163b38cc0f8311';
const review='0970edd3181ac5b1184ae0165f2eb240fb8bac09';
const git=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:32*1024*1024});
const tree=ref=>new Map(git('ls-tree','-rz','--full-tree',ref).toString().split('\0').filter(Boolean).map(row=>{
  const m=row.match(/^(\d+) (\w+) ([a-f0-9]+)\t(.*)$/s);assert.ok(m);return [m[4],{mode:m[1],kind:m[2],oid:m[3]}];
}));
const before=tree(baseline),after=tree(sourceSha),priorR05=tree(r05);
const expectedModified=[
  '.env.aistudio.example','docs/operations/GOOGLE_AI_STUDIO_ENVIRONMENT.md',
  'scripts/database/initialize-post28-upgrade.mjs','scripts/database/post28-r05-known-source.mjs',
  'scripts/database/verify-post28-upgrade-backup.mjs','tests/database/post28-isolation.test.mjs',
  'tests/database/post28-r05-known-source.test.mjs',
].sort();
const removed=[...before.keys()].filter(file=>!after.has(file));assert.deepEqual(removed,[]);
const modified=[...before].filter(([file,entry])=>entry.oid!==after.get(file).oid||entry.mode!==after.get(file).mode).map(([file])=>file).sort();
assert.deepEqual(modified,expectedModified);
const priorEvidence=[...before].filter(([file])=>file.startsWith('docs/reviews/evidence/'));
assert.ok(priorEvidence.every(([file,entry])=>after.get(file).oid===entry.oid));
const importedEvidence=[...priorR05].filter(([file])=>file.startsWith('docs/reviews/evidence/')&&!before.has(file));
assert.ok(importedEvidence.length>0);
assert.ok(importedEvidence.every(([file,entry])=>after.get(file)?.oid===entry.oid));
const imports=['scripts/database/post28-r05-trust-policy.mjs','tests/database/post28-r05-trust-policy.test.mjs','tests/database/fixtures/post28-real-clean-asset-replay.json'];
assert.ok(imports.every(file=>after.get(file)?.oid===priorR05.get(file)?.oid));
const reviewFile='docs/reviews/POST28_R05_INDEPENDENT_TECHNICAL_SOURCE_REVIEW_2026-10-17.md';
assert.deepEqual(git('show',':'+reviewFile),git('show',review+':'+reviewFile));
for(const line of [3,4,5,6])assert.ok(git('show',review+':'+reviewFile).toString().split('\n')[line-1].endsWith('  '));
const {verifyEvidenceIndex}=await import(pathToFileURL(path.join(root,'scripts/lib/verify-evidence-index.mjs')));
const importedIndexes=[...after.keys()].filter(file=>file.endsWith('/evidence-index.json')&&!before.has(file));
const verifiedImportedIndexes=importedIndexes.map(file=>({path:file,...verifyEvidenceIndex(path.resolve(file),{gitRef:sourceSha,root})}));
const validationDirectory=path.resolve('../post28-consolidation-validation-20261019');
const validation=JSON.parse(fs.readFileSync(path.join(validationDirectory,'validation.json')));
assert.equal(validation.sourceSha,sourceSha);assert.ok(validation.results.every(result=>result.exitCode===0));
assert.deepEqual(validation.results[0].counts,{tests:92,pass:92,fail:0,cancelled:0,skipped:0,todo:0});
const report={kind:'POST28_SOURCE_PRESERVATION_AUDIT',baseline,sourceSha,r05Head:r05,reviewHead:review,
  baselineFiles:before.size,deletedBaselineFiles:removed,modifiedBaselineFiles:modified,
  priorEvidenceFilesUnchanged:priorEvidence.length,importedEvidenceFilesByteIdentical:importedEvidence.length,
  importedEvidenceIndexes:verifiedImportedIndexes,
  r05TrustGuardAndFixtureByteIdentical:true,reviewStagedByteIdentical:true,
  upstreamReviewFormatting:{markdownHardBreakLines:[3,4,5,6],preservedVerbatim:true,generalWhitespaceRulesChanged:false},
  nativeCreatorOid:after.get('scripts/database/create-post28-native-lab.mjs').oid,
  nativeCreatorUnchanged:after.get('scripts/database/create-post28-native-lab.mjs').oid===before.get('scripts/database/create-post28-native-lab.mjs').oid,
  appsPackagesConfigWorkflowsUnchanged:[...before].filter(([file])=>/^(apps|packages|config|\.github)\//.test(file)).every(([file,entry])=>after.get(file).oid===entry.oid),
  pendingReviewMergeNotYetAncestorOfSource:true,newRuntimeAcceptance:false};
assert.equal(report.nativeCreatorUnchanged,true);assert.equal(report.appsPackagesConfigWorkflowsUnchanged,true);
const dest=path.join(root,'docs/reviews/evidence/post28',sourceSha,'branch-consolidation');fs.mkdirSync(dest,{recursive:true});
fs.writeFileSync(path.join(dest,'.gitattributes'),'* -text whitespace=cr-at-eol\n*.log -whitespace\n');
for(const file of fs.readdirSync(validationDirectory))fs.copyFileSync(path.join(validationDirectory,file),path.join(dest,file));
fs.copyFileSync(path.resolve('../validate-post28-consolidation.mjs'),path.join(dest,'validate-post28-consolidation.mjs'));
fs.copyFileSync(path.resolve('../collect-post28-consolidation.mjs'),path.join(dest,'collect-post28-consolidation.mjs'));
fs.writeFileSync(path.join(dest,'preservation-audit.json'),JSON.stringify(report,null,2)+'\n');
const files=fs.readdirSync(dest).filter(file=>file!=='evidence-index.json').sort().map(file=>{
  const bytes=fs.readFileSync(path.join(dest,file));return {path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
});
fs.writeFileSync(path.join(dest,'evidence-index.json'),JSON.stringify({version:1,kind:'POST28_BRANCH_CONSOLIDATION_EVIDENCE',sourceSha,files},null,2)+'\n');
console.log(JSON.stringify({evidenceFiles:files.length,baselineFiles:report.baselineFiles,modifiedBaselineFiles:modified.length,priorEvidenceFilesUnchanged:report.priorEvidenceFilesUnchanged,importedEvidenceFilesByteIdentical:report.importedEvidenceFilesByteIdentical,importedIndexes:verifiedImportedIndexes}));
