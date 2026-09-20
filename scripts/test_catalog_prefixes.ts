import fs from 'fs';
import path from 'path';

const catalogPath = path.join(process.cwd(), 'workspace/catalog-index/phase10CatalogIndex.json');
const phase10MajorCatalogSamples = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

for (const item of phase10MajorCatalogSamples) {
  console.log(item.code);
}
