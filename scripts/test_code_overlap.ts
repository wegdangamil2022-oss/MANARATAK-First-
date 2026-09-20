import fs from 'fs';
import path from 'path';

const catalogPath = path.join(process.cwd(), 'workspace/catalog-index/phase10CatalogIndex.json');
const phase10MajorCatalogSamples = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

function check() {
  const catalogCodes = phase10MajorCatalogSamples.map((m: any) => m.code).filter(Boolean);
  console.log(catalogCodes.length);
}
check();
