import fs from 'node:fs';
import path from 'node:path';

const SOURCE_EXT_RE = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/u;
const IMPORT_RE = /\b(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|\brequire\(\s*['"]([^'"]+)['"]\s*\)/gu;

const normalize = (value) => value.split(path.sep).join('/');
const rel = (root, value) => normalize(path.relative(root, value));

function walk(root, dir) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return [];
  const out = [];
  const stack = [absolute];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (['node_modules', 'dist', 'coverage', '.turbo', '.next', '.git', 'archive'].includes(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (SOURCE_EXT_RE.test(entry.name) && !/\.(?:spec|test|stories)\.[^.]+$/u.test(entry.name)) out.push(full);
    }
  }
  return out;
}

function sourceFiles(root) {
  return [...walk(root, 'apps'), ...walk(root, 'packages')];
}

function lineNumber(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) if (source.charCodeAt(index) === 10) line += 1;
  return line;
}

function violation(kind, root, file, source, offset, detail) {
  return { kind, file: rel(root, file), line: lineNumber(source, offset), detail };
}

function importsOf(source) {
  const imports = [];
  for (const match of source.matchAll(IMPORT_RE)) imports.push({ specifier: match[1] ?? match[2], index: match.index ?? 0, raw: match[0] });
  return imports;
}

export function collectPrismaBoundaryViolations(root) {
  const violations = [];
  for (const file of sourceFiles(root)) {
    const relative = rel(root, file);
    const source = fs.readFileSync(file, 'utf8');
    const prismaImports = importsOf(source).filter((item) => item.specifier === '@prisma/client');
    const constructor = /\bnew\s+PrismaClient\s*\(/u.exec(source);
    if (!prismaImports.length && !constructor) continue;
    const allowed = relative.startsWith('packages/infrastructure/src/') || relative.startsWith('packages/infrastructure/tests/database/') || relative === 'apps/api/src/infrastructure/di/container.ts' || relative === 'apps/api/src/infrastructure/runtime/RuntimeResourceRegistry.ts';
    if (!allowed) {
      const offset = prismaImports[0]?.index ?? constructor?.index ?? 0;
      violations.push(violation('cross-domain-prisma', root, file, source, offset, 'Prisma is allowed only inside Infrastructure ownership adapters, Infrastructure database tests, or the explicit API composition/runtime resource authority.'));
    }
  }
  return violations;
}

export function collectCanonicalIdentityViolations(root) {
  const violations = [];
  const sensitivePrefixes = [
    'apps/web/src/features/public-template/',
    'apps/admin/src/',
    'packages/application/src/universities/',
    'packages/application/src/scholarships/',
    'packages/application/src/courses/',
    'packages/application/src/read-models/',
  ];
  const relationshipCallbackRe = /\.(?:find|some)\s*\(\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*([\s\S]{0,260}?)\)/gu;
  const displayEqualityRe = /(?:\.name|\.label|\.title|\.displayName|\.canonicalName)\s*===|===\s*(?:[A-Za-z_$][\w$]*\.)?(?:name|label|title|displayName|canonicalName)\b/u;

  for (const file of sourceFiles(root)) {
    const relative = rel(root, file);
    if (!sensitivePrefixes.some((prefix) => relative.startsWith(prefix))) continue;
    if (relative.includes('/publicPrototypeDataSource.') || relative.includes('/data/mockData.')) continue;
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(relationshipCallbackRe)) {
      if (displayEqualityRe.test(match[1] ?? '')) {
        violations.push(violation('name-based-relation', root, file, source, match.index ?? 0, 'Relationship resolution must use canonical IDs, never equality on display name/label/title.'));
      }
    }
    if (relative.endsWith('/publicScholarshipDataSource.ts')) {
      const synthetic = /id\s*:\s*`(?:university|major|program|test|country):\$\{/gu;
      for (const match of source.matchAll(synthetic)) violations.push(violation('synthetic-relation-id', root, file, source, match.index ?? 0, 'Scholarship relationship identities must come from owner canonical IDs, never synthesized display identities.'));
    }
  }
  return violations;
}

export function collectPublicFixtureViolations(root) {
  const violations = [];
  const base = path.join(root, 'apps/web/src/features/public-template');
  if (!fs.existsSync(base)) return violations;
  for (const file of walk(root, 'apps/web/src/features/public-template')) {
    const relative = rel(root, file);
    if (relative.endsWith('/publicPrototypeDataSource.ts') || relative.endsWith('/data/mockData.ts')) continue;
    const source = fs.readFileSync(file, 'utf8');
    for (const marker of ['MOCK_', 'GOLDEN_IMPORTED_COURSES']) {
      const index = source.indexOf(marker);
      if (index >= 0) violations.push(violation('public-live-fixture', root, file, source, index, `${marker} is forbidden in the production public composition path.`));
    }
    const mockImport = source.search(/from\s+['"][^'"]*data\/mockData['"]/u);
    if (mockImport >= 0) violations.push(violation('public-live-mock-import', root, file, source, mockImport, 'Live public files must not import prototype/mock datasets.'));
    const prototypeMention = source.indexOf('publicPrototypeDataSource');
    if (prototypeMention >= 0 && !relative.endsWith('/usePublicLiveData.ts')) {
      violations.push(violation('public-prototype-leak', root, file, source, prototypeMention, 'Only the explicit public data-mode switch may reference the prototype adapter.'));
    }
  }

  const modeFile = path.join(root, 'apps/web/src/features/public-template/usePublicLiveData.ts');
  if (fs.existsSync(modeFile)) {
    const source = fs.readFileSync(modeFile, 'utf8');
    if (!/\b(?:mode|dataMode)\s*===\s*['"]prototype['"]/u.test(source) || !source.includes("import('./publicPrototypeDataSource')")) {
      violations.push(violation('public-prototype-mode', root, modeFile, source, 0, 'Prototype data must be dynamically imported only behind the explicit prototype mode.'));
    }
  }
  return violations;
}

export function collectStudentLocalStorageViolations(root) {
  const violations = [];
  const guardedRoots = [
    'apps/web/src/features/students',
    'apps/web/src/features/student-tools',
  ];
  for (const guardedRoot of guardedRoots) {
    for (const file of walk(root, guardedRoot)) {
      const source = fs.readFileSync(file, 'utf8');
      const match = /\b(?:window\.)?localStorage\b/u.exec(source);
      if (match) violations.push(violation('p15-localstorage', root, file, source, match.index, 'P15 live workspace/tool state must come from authenticated APIs, not localStorage.'));
    }
  }
  return violations;
}

export function collectAdminBoundaryViolations(root) {
  const violations = [];
  for (const file of walk(root, 'apps/admin/src')) {
    const source = fs.readFileSync(file, 'utf8');
    for (const item of importsOf(source)) {
      if (item.specifier === '@prisma/client' || item.specifier === '@manaratak/infrastructure' || item.specifier.startsWith('@manaratak/infrastructure/')) {
        violations.push(violation('p23-persistence-import', root, file, source, item.index, `Admin cannot import persistence/infrastructure module ${item.specifier}.`));
      }
      if (item.specifier === '@manaratak/application' || item.specifier.startsWith('@manaratak/application/')) {
        violations.push(violation('p23-application-bypass', root, file, source, item.index, `Admin must use owner HTTP/API contracts instead of directly importing Application module ${item.specifier}.`));
      }
    }
    for (const pattern of [/\bnew\s+PrismaClient\b/gu, /\$queryRaw\b/gu, /\$executeRaw\b/gu, /\bnew\s+[A-Za-z0-9_]*Repository\s*\(/gu]) {
      for (const match of source.matchAll(pattern)) violations.push(violation('p23-business-persistence', root, file, source, match.index ?? 0, 'P23 is a control plane and may not instantiate repositories or execute persistence directly.'));
    }
  }
  return violations;
}

export function collectAIVendorViolations(root) {
  const violations = [];
  const vendorSpecRe = /^(?:openai|anthropic|@anthropic\/|@google\/generative-ai|@google\/genai|cohere|cohere-ai|groq-sdk)/u;
  const vendorMarkerRe = /api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com|api\.cohere\.ai|api\.groq\.com|OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY|GEMINI_API_KEY/gu;
  for (const file of sourceFiles(root)) {
    const relative = rel(root, file);
    if (relative.includes('/src/ai-platform/')) continue;
    const source = fs.readFileSync(file, 'utf8');
    for (const item of importsOf(source)) {
      if (vendorSpecRe.test(item.specifier)) violations.push(violation('ai-vendor-outside-p17', root, file, source, item.index, `AI vendor SDK ${item.specifier} is allowed only inside P17 ai-platform adapters.`));
    }
    for (const match of source.matchAll(vendorMarkerRe)) violations.push(violation('ai-vendor-endpoint-outside-p17', root, file, source, match.index ?? 0, 'AI vendor endpoints/secrets must remain inside P17 ai-platform adapters.'));
  }
  return violations;
}

export function collectCertificateBoundaryViolations(root) {
  const violations = [];
  const p13Roots = [
    'packages/domain/src/courses',
    'packages/application/src/courses',
    'packages/infrastructure/src/courses',
    'apps/api/src/presentation/api/router/CourseAdminRouter.ts',
    'apps/api/src/presentation/api/router/CoursePublicRouter.ts',
  ];
  const forbidden = /\b(?:generateCertificate|issueCertificate|createCertificate)\s*\(|\bCertificateUseCases\b|certificateRepository\.issue\s*\(|from\s+['"][^'"]*certificates[^'"]*['"]/gu;
  for (const item of p13Roots) {
    const absolute = path.join(root, item);
    const files = fs.existsSync(absolute) && fs.statSync(absolute).isDirectory() ? walk(root, item) : (fs.existsSync(absolute) ? [absolute] : []);
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(forbidden)) violations.push(violation('p13-certificate-authority', root, file, source, match.index ?? 0, 'P13 may emit completion facts only; certificate lifecycle belongs exclusively to P14.'));
    }
  }

  const progress = path.join(root, 'packages/application/src/courses/use-cases/CourseProgressUseCases.ts');
  const pathUseCases = path.join(root, 'packages/application/src/courses/use-cases/LearningPathUseCases.ts');
  const consumer = path.join(root, 'packages/application/src/certificates/use-cases/CertificateCompletionEventConsumer.ts');
  for (const [file, markers, detail] of [
    [progress, ['COURSE_COMPLETED_EVENT_TYPE', 'certificateOwnerPhase'], 'P13 course completion must expose the P14 certificate-authority event contract.'],
    [pathUseCases, ['LEARNING_PATH_COMPLETED_EVENT_TYPE', 'certificateOwnerPhase'], 'P13 learning-path completion must expose the P14 certificate-authority event contract.'],
    [consumer, ['CourseCompleted', 'LearningPathCompleted', 'consumeCompletionEvent'], 'P14 must remain the event consumer for P13 completion facts.'],
  ]) {
    if (!fs.existsSync(file)) continue;
    const source = fs.readFileSync(file, 'utf8');
    if (!markers.every((marker) => source.includes(marker))) violations.push(violation('p13-p14-event-contract', root, file, source, 0, detail));
  }
  return violations;
}

export function collectAuthorityDocumentViolations(root) {
  const violations = [];
  const required = [
    ['docs/governance/roadmap/MANARATAK-2.0-Roadmap-v6.0.md', ['Phase 10:** Majors & Disciplines Platform', 'Phase 11:** Universities & Institutions Platform', 'Phase 13:** Learning Platform', 'Phase 14:** Enterprise Certificates Platform', 'Phase 15:** Enterprise Student Platform (Student Workspace)', 'Phase 23:** Enterprise Administration Portal', 'Phase 24:** Enterprise Public Platform']],
    ['docs/architecture/models/Enterprise-Domain-Ownership-Matrix-v1.0.md', ['P10:** owns canonical Major identity', 'P13:** owns learning catalog/progression/completion truth', 'does **not** issue certificates', 'P14:** is the sole authority for certificate issuance', 'P15:** owns authenticated student workspace', 'P23:** owns admin UI/control-plane composition', 'P24:** owns public composition']],
    ['docs/architecture/models/Enterprise-API-Registry-v1.0.md', ['no synchronous Certificate Generation API is registered', 'no general Student Application API is registered under Phase 15']],
    ['docs/architecture/models/Enterprise-Event-Catalog-v1.0.md', ['Producer:** Phase 13 (Learning Platform)', 'Consumers:** Phase 14 (Enterprise Certificates Platform)', 'no P15 `ApplicationSubmitted` enterprise event']],
    ['docs/architecture/models/Enterprise-Bounded-Context-Map-v1.0.md', ['P13 Learning', 'P14 Certificates', 'P23 Admin', 'P24 Public', 'no synchronous certificate-generation API']],
  ];
  for (const [relative, markers] of required) {
    const file = path.join(root, relative);
    if (!fs.existsSync(file)) {
      violations.push({ kind: 'authority-doc-missing', file: relative, line: 1, detail: 'Authoritative Roadmap/architecture document is missing.' });
      continue;
    }
    const source = fs.readFileSync(file, 'utf8');
    for (const marker of markers) {
      if (!source.includes(marker)) violations.push({ kind: 'authority-mismatch', file: relative, line: 1, detail: `Missing required Roadmap v6.0 authority marker: ${marker}` });
    }
  }
  return violations;
}

export function collectMatrixContractViolations(root) {
  const relative = 'docs/remediation/CROSS_PHASE_RELATIONSHIP_CLOSURE_MATRIX.md';
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) return [{ kind: 'matrix-missing', file: relative, line: 1, detail: 'Active Cross-Phase Relationship Closure Matrix is required.' }];
  const source = fs.readFileSync(file, 'utf8');
  const violations = [];
  for (let index = 1; index <= 68; index += 1) {
    const id = `R-${String(index).padStart(3, '0')}`;
    const line = source.split('\n').find((value) => value.startsWith(`| ${id} |`));
    if (!line) {
      violations.push({ kind: 'matrix-row-missing', file: relative, line: 1, detail: `${id} is missing from the active cross-phase matrix.` });
      continue;
    }
    if (line.includes('| Missing |')) violations.push({ kind: 'matrix-source-gap', file: relative, line: 1, detail: `${id} regressed to Missing.` });
    const cells = line.split('|').map((cell) => cell.trim()).filter(Boolean);
    if (cells.length < 15) violations.push({ kind: 'matrix-contract-incomplete', file: relative, line: 1, detail: `${id} does not preserve the full relationship closure contract columns.` });
  }
  return violations;
}

export function collectOperationalToolingViolations(root) {
  const violations = [];
  const policyPath = path.join(root, 'scripts/architecture/operational-tooling-boundary.json');
  if (!fs.existsSync(policyPath)) {
    return [{ kind: 'operational-tooling-policy-missing', file: 'scripts/architecture/operational-tooling-boundary.json', line: 1, detail: 'scripts/** must have an explicit dependency/source ownership policy.' }];
  }
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  const classifiedPrisma = new Set(policy.classifiedDirectPrismaScripts ?? []);
  const classifiedPresentation = new Set(policy.classifiedPresentationImportScripts ?? []);
  for (const file of walk(root, 'scripts')) {
    const relativeFile = path.relative(root, file).replaceAll('\\', '/');
    if (relativeFile.startsWith('scripts/archive/') || relativeFile.startsWith('scripts/legacy/')) continue;
    const source = fs.readFileSync(file, 'utf8');
    for (const imported of importsOf(source)) {
      if ((imported.specifier.includes('apps/web/src/') || imported.specifier.includes('apps/admin/src/')) && !classifiedPresentation.has(relativeFile)) {
        violations.push(violation('operational-presentation-bypass', root, file, source, imported.index, 'Operational tooling may not import Web/Admin presentation implementation.'));
      }
    }
    if (source.includes('@prisma/client') && !classifiedPrisma.has(relativeFile)) {
      violations.push(violation('operational-prisma-unclassified', root, file, source, source.indexOf('@prisma/client'), 'Direct Prisma use in scripts/** must be explicitly classified in the operational tooling policy.'));
    }
  }
  for (const relativeFile of classifiedPrisma) {
    const absolute = path.join(root, relativeFile);
    if (!fs.existsSync(absolute)) {
      violations.push({ kind: 'operational-prisma-classification-stale', file: relativeFile, line: 1, detail: 'Operational Prisma classification points at a missing script.' });
    }
  }
  return violations;
}

export function collectSourceArchitectureViolations(root) {
  return [
    ...collectPrismaBoundaryViolations(root),
    ...collectCanonicalIdentityViolations(root),
    ...collectPublicFixtureViolations(root),
    ...collectStudentLocalStorageViolations(root),
    ...collectAdminBoundaryViolations(root),
    ...collectAIVendorViolations(root),
    ...collectCertificateBoundaryViolations(root),
    ...collectAuthorityDocumentViolations(root),
    ...collectMatrixContractViolations(root),
    ...collectOperationalToolingViolations(root),
  ].sort((a, b) => `${a.file}:${a.line}:${a.kind}`.localeCompare(`${b.file}:${b.line}:${b.kind}`));
}
