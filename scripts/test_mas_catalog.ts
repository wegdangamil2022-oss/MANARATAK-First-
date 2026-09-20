import fs from 'fs';
import path from 'path';

const catalogPath = path.join(process.cwd(), 'workspace/catalog-index/phase10CatalogIndex.json');
const phase10MajorCatalogSamples = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

const masItems = phase10MajorCatalogSamples.filter((x: any) => x.code?.startsWith('MAS'));
console.log(masItems.length);
