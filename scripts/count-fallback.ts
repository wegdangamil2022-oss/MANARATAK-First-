import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'apps/web/src/features/admin-preview/AdminInternationalTestsPreviewPage.tsx');
const content = fs.readFileSync(filePath, 'utf-8');

// Match all objects in the fallback array by finding keys like id: 'test-...'
const regex = /id:\s*'([^']+)'/g;
let match;
const ids: string[] = [];

while ((match = regex.exec(content)) !== null) {
  ids.push(match[1]);
}

console.log(`Found ${ids.length} fallback test items in AdminInternationalTestsPreviewPage.tsx:`);
console.log(ids);
