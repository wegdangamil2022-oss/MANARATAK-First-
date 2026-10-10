import fs from 'node:fs';
import path from 'node:path';

// Source manifests own this baseline; deleted preview UI is not a source registry.
const sourceRoot = path.resolve(process.cwd(), 'workspace/import-sources/international-tests');
const read = (name) => JSON.parse(fs.readFileSync(path.join(sourceRoot, 'reconciliation', name), 'utf8'));
const manifest = read('manifest_56.json');
const reconciliation = read('final_matching_data.json');
const activeKeys = manifest.map((entry) => `${entry.folder}/${entry.file}`);
const archivedKeys = reconciliation.absent_old_tests.map((entry) => entry.id);
const duplicates = (keys) => keys.filter((key, index) => keys.indexOf(key) !== index);
const missingFiles = activeKeys.filter((key) => !fs.existsSync(path.join(sourceRoot, 'unified-56', key)));
const result = {
  active: activeKeys.length,
  archived: archivedKeys.length,
  total: activeKeys.length + archivedKeys.length,
  duplicateSources: [...new Set(duplicates(activeKeys))],
  duplicateIds: [...new Set(duplicates(archivedKeys))],
  missingFiles,
};
console.log(JSON.stringify(result, null, 2));
if (result.active !== 56 || result.archived !== 3 || result.total !== 59 ||
    result.duplicateSources.length || result.duplicateIds.length || missingFiles.length ||
    archivedKeys.some((id) => !id)) process.exit(1);
