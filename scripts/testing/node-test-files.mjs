import {readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
// node:test suites must execute under Node, including the TypeScript contracts.
export const nodeTestFiles=readdirSync(path.join(root,'tests'),{recursive:true})
  .filter(file=>/\.test\.(mjs|cjs)$/.test(file) ||
    (/\.test\.tsx?$/.test(file) && /from\s+['"]node:test['"]/.test(readFileSync(path.join(root,'tests',file),'utf8'))))
  .sort().map(file=>path.join('tests',file).replaceAll('\\','/'));
