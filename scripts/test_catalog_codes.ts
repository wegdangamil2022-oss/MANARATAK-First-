import fs from 'fs';
import path from 'path';

const catalogPath = path.join(process.cwd(), 'workspace/catalog-index/phase10CatalogIndex.json');
const phase10MajorCatalogSamples = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

console.log(phase10MajorCatalogSamples.slice(0, 5).map((x: any) => ({ code: x.code, id: x.id, displayName: x.displayName })));
