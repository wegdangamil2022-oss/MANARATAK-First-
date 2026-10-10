import {defineConfig} from 'vitest/config';
import {resolve} from 'node:path';
export default defineConfig({esbuild:{jsx:'automatic'},resolve:{alias:Object.fromEntries(['core','domain','shared','application','infrastructure'].map(name=>['@manaratak/'+name,resolve('packages/'+name+'/src/index.ts')]))},test:{environment:'node',include:['**/InternationalTestGovernanceCloseout.spec.ts','**/InternationalTestGovernanceCloseout.spec.tsx'],testTimeout:5000,maxWorkers:2}});
