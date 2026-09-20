import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const TARGET = resolve(ROOT, 'apps/web/src/features/public-template');
const REQUIRE_READY = process.argv.includes('--require-ready');
const ARABIC = /[\u0600-\u06FF]/;

function walk(directory) {
  const output = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) output.push(...walk(path));
    else if (['.ts', '.tsx'].includes(extname(path))) output.push(path);
  }
  return output;
}

const files = walk(TARGET);
let arabicLines = 0;
let filesWithArabic = 0;
const top = [];

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const count = lines.filter((line) => ARABIC.test(line) && !line.trimStart().startsWith('//')).length;
  if (count > 0) {
    filesWithArabic += 1;
    arabicLines += count;
    top.push([relative(ROOT, file), count]);
  }
}

top.sort((a, b) => b[1] - a[1]);
const app = readFileSync(resolve(TARGET, 'PublicTemplateApp.tsx'), 'utf8');
const failClosed = app.includes("const language: Language = 'ar'");
const ready = arabicLines === 0 && !failClosed;

console.log(`PUBLIC_TEMPLATE_TS_TSX_FILES=${files.length}`);
console.log(`PUBLIC_TEMPLATE_FILES_WITH_ARABIC_COPY=${filesWithArabic}`);
console.log(`PUBLIC_TEMPLATE_ARABIC_COPY_LINES=${arabicLines}`);
console.log(`PUBLIC_TEMPLATE_FAIL_CLOSED_AR=${failClosed ? 'YES' : 'NO'}`);
console.log(`PUBLIC_TEMPLATE_ENGLISH_ACTIVATION=${ready ? 'READY' : 'BLOCKED'}`);
console.log('PUBLIC_TEMPLATE_TOP_COPY_DEBT=');
for (const [file, count] of top.slice(0, 12)) console.log(`  ${count}\t${file}`);

if (REQUIRE_READY && !ready) process.exitCode = 1;
