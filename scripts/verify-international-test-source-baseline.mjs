import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.resolve(
  process.cwd(),
  'apps/web/src/features/admin-preview/AdminInternationalTestsPreviewPage.tsx'
);
const source = fs.readFileSync(sourcePath, 'utf8');
const mapStart = source.indexOf('const categoryMap:');
const mapEnd = source.indexOf('\n};', mapStart);
if (mapStart < 0 || mapEnd < 0) throw new Error('International Test category baseline was not found.');

const baseline = source.slice(mapStart, mapEnd);
const legacyMarker = baseline.indexOf('// Legacy (3)');
if (legacyMarker < 0) throw new Error('Legacy baseline marker was not found.');

const readKeys = (text) => [...text.matchAll(/^\s*'([^']+)'\s*:/gm)].map((match) => match[1]);
const allKeys = readKeys(baseline);
const archivedKeys = readKeys(baseline.slice(legacyMarker));
const activeKeys = allKeys.slice(0, allKeys.length - archivedKeys.length);
const duplicates = allKeys.filter((key, index) => allKeys.indexOf(key) !== index);

const result = {
  active: activeKeys.length,
  archived: archivedKeys.length,
  total: allKeys.length,
  duplicateIds: [...new Set(duplicates)],
  duplicateSlugs: [...new Set(duplicates)]
};

if (result.active !== 56 || result.archived !== 3 || result.total !== 59 || duplicates.length > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
