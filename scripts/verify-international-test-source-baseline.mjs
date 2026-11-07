import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),base=path.resolve(root,'workspace/import-sources/international-tests/reviewed-20261107');
const manifest=JSON.parse(fs.readFileSync(path.join(base,'catalog-manifest.json'),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const issues=[],keys=new Set(),codes=new Set();
for(const row of manifest.matching_rows){
  const file=fs.realpathSync(path.resolve(root,row.file));
  if(!file.startsWith(base+path.sep))throw Error('TEST_SOURCE_PATH_OUTSIDE_CATALOG');
  const bytes=fs.readFileSync(file);
  if(sha(bytes)!==row.sourceHash)issues.push('HASH:'+row.sourceKey);
  if(keys.has(row.sourceKey))issues.push('DUPLICATE:'+row.sourceKey);
  keys.add(row.sourceKey);codes.add(row.code);
  const sections=[...bytes.toString('utf8').matchAll(/^##\s+(\d+)\.\s*(.+)$/gm)];
  if(sections.length!==row.sections||sections.some((s,i)=>Number(s[1])!==i+1))issues.push('SECTIONS:'+row.sourceKey);
}
for(const bundle of manifest.bundles)if(sha(fs.readFileSync(path.resolve(root,bundle.path)))!==bundle.sha256)issues.push('ARCHIVE_HASH:'+bundle.path);
if(keys.size!==253||codes.size!==234||manifest.sourceCount!==253||manifest.entityCount!==234||manifest.bundles.length!==5)issues.push('CATALOG_COUNTS');
if(fs.existsSync(path.resolve(root,'workspace/import-sources/international-tests/unified-56')))issues.push('RETIRED_SOURCE_STILL_ACTIVE');
console.log(JSON.stringify({guides:keys.size,identities:codes.size,bundles:manifest.bundles.length,issues},null,2));
if(issues.length)process.exitCode=1;
