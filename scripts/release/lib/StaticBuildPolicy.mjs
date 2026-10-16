import fs from 'node:fs';
import path from 'node:path';
import {staticScriptEntries} from './StaticScriptPolicy.mjs';
import { SHA } from './ReleaseContracts.mjs';
export function inspectStaticBuild(directory, unit, expectedSha) {
  try {
    const index = path.join(directory, 'index.html'),
      descriptor = JSON.parse(
        fs.readFileSync(path.join(directory, 'manaratak-build.json'), 'utf8'),
      );
    const html = fs.readFileSync(index, 'utf8');
    if (
      descriptor.version !== 1 ||
      descriptor.unit !== unit ||
      !SHA.test(descriptor.sourceSha) ||
      (expectedSha && descriptor.sourceSha !== expectedSha) ||
      !html.includes(`<meta name="manaratak-build-sha" content="${descriptor.sourceSha}">`)
    )
      throw new Error('INVALID');
    if(fs.lstatSync(directory).isSymbolicLink())throw new Error('INVALID');
    const root=fs.realpathSync(directory);
    for(const file of ['index.html','manaratak-build.json'])
      if(fs.lstatSync(path.join(directory,file)).isSymbolicLink())throw new Error('INVALID');
    for(const entry of staticScriptEntries(html)) {
      let name=decodeURIComponent(new URL(entry,'https://static.invalid/').pathname).replace(/^\//,'');
      if(unit==='admin'&&name.startsWith('admin/'))name=name.slice('admin/'.length);
      const candidate=path.resolve(root,name);
      if(!candidate.startsWith(root+path.sep))throw new Error('INVALID');
      let current=root;
      for(const part of path.relative(root,candidate).split(path.sep)) {
        current=path.join(current,part);
        if(fs.lstatSync(current).isSymbolicLink())throw new Error('INVALID');
      }
      if(!fs.statSync(candidate).isFile()||fs.statSync(candidate).size===0)throw new Error('INVALID');
    }
    return { version: 1, unit, status: 'BUILT', sourceSha: descriptor.sourceSha };
  } catch {
    return { version: 1, unit, status: 'UNBUILT' };
  }
}
