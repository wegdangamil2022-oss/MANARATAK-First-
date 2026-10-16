import {isBuiltin} from 'node:module';

// The runtime contract follows imports actually retained by the API bundler.
export function runtimeExternalModules(metadata) {
  const outputs=Object.entries(metadata?.outputs??{}).filter(([file])=>file.endsWith('server.cjs'));
  if(outputs.length!==1||!Array.isArray(outputs[0][1].imports))throw new Error('RELEASE_API_METAFILE_INVALID');
  const modules=[...new Set(outputs[0][1].imports.filter(row=>row.external&&!isBuiltin(row.path)).map(row=>row.path))].sort();
  if(!modules.includes('@prisma/client')||modules.some(name=>!/^(@[a-z0-9._-]+\/)?[a-z0-9._-]+(\/[a-zA-Z0-9._/-]+)?$/.test(name)))throw new Error('RELEASE_API_RUNTIME_MODULES_INVALID');
  return modules;
}
