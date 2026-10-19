import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const files = ['apps/web/src/i18n/ar.ts', 'apps/admin/src/i18n/ar.ts'];
const approved = new Set([
  'ABSHEER',
  'React',
  'SQL',
  'IELTS',
  'ETS',
  'Coursera',
  'edX',
  'CSV',
  'JSON',
  'Phase',
  'Source',
  'Runtime',
  'Migration',
  'Canonical',
  'Google',
  'Studio',
  'VITE_ADMIN_URL',
  'CIP',
  'ISCED',
  'AI',
  'CMS',
  'RTL',
  'LTR',
  'MNR',
  'ABC123',
  'Finance',
  'Excel',
  'API',
  'URL',
  'ID',
  'Slug',
  'Tokens',
  'College',
  'Board',
  'Cambridge',
  'apps',
  'admin',
  'absheer',
  'csv',
  'json',
  'fallback',
  'Source-only',
]);

export function unapprovedArabicWords(value) {
  // Translation variables are syntax, not prose. TypeScript already decoded
  // escapes in the literal; remove only well-formed interpolation identifiers.
  const prose = value.replace(/\{[A-Za-z_][A-Za-z0-9_]*\}/g, '').replaceAll('&lt;', '');
  if (!/[\u0600-\u06FF]/u.test(prose)) return [];
  return (prose.match(/[A-Za-z][A-Za-z0-9_.@-]*/g) || [])
    .map((word) => word.replace(/[.]+$/, ''))
    .filter(
      (word) =>
        !approved.has(word) &&
        !/^[A-Z0-9_.@-]+$/.test(word) &&
        !word.includes('@') &&
        !/^https?/i.test(word),
    );
}

export function inspectArabicCopy(sourceText, file) {
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);
  const findings = [];
  const values = new Map();
  function visit(node) {
    if (ts.isPropertyAssignment(node) && ts.isStringLiteralLike(node.initializer)) {
      const key =
        ts.isIdentifier(node.name) || ts.isStringLiteralLike(node.name)
          ? node.name.text
          : node.name.getText(source);
      const value = node.initializer.text;
      values.set(key, value);
      const words = unapprovedArabicWords(value);
      if (words.length)
        findings.push({
          file,
          line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
          key,
          words,
          value,
        });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return { findings, values };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const results = files.map((file) => inspectArabicCopy(fs.readFileSync(file, 'utf8'), file));
  const findings = results.flatMap((result) => result.findings);
  for (const finding of findings.slice(0, 80))
    console.log(
      `FAIL ${finding.file}:${finding.line} ${finding.key} -> ${finding.words.join(', ')} :: ${finding.value}`,
    );
  if (!findings.length) console.log('PASS arabic-values-no-accidental-english-prose');
  const representative = [
    'view_service',
    'browse_absheer_student_document_visa_travel_acad',
    'explore_absheer_student_tools_checklists_assista',
    'manage_service_catalog_items_readiness_publication',
  ];
  const reps = representative.every((key) =>
    results.every((result) => {
      const value = result.values.get(key);
      return (
        typeof value === 'string' &&
        /[\u0600-\u06FF]/u.test(value) &&
        !/[A-Za-z]/.test(
          value.replaceAll('ABSHEER', '').replace(/\{[A-Za-z_][A-Za-z0-9_]*\}/g, ''),
        )
      );
    }),
  );
  console.log(`${reps ? 'PASS' : 'FAIL'} representative-arabic-copy`);
  console.log(
    `ARABIC_SEMANTIC_COPY=${findings.length === 0 && reps ? 'PASS' : 'FAIL'} findings=${findings.length}`,
  );
  process.exitCode = findings.length === 0 && reps ? 0 : 1;
}
