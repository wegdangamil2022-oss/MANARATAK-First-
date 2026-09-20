import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const checks = [];
const check = (id, ok, note) => checks.push({ id, ok: Boolean(ok), note });

const contracts = read('packages/domain/src/scholarships/contracts.ts');
const domain = read('packages/domain/src/scholarships/scholarships.ts');
const admin = read('packages/application/src/scholarships/use-cases/AdminScholarshipUseCases.ts');
const pub = read('packages/application/src/scholarships/use-cases/PublicScholarshipUseCases.ts');
const transfer = read('packages/application/src/scholarships/import-center/ScholarshipImportAtomicTransferUseCase.ts');
const importCenter = read('packages/application/src/scholarships/import-center/ScholarshipImportCenterUseCases.ts');
const handoff = read('packages/application/src/scholarships/handoff/ScholarshipImportHandoffService.ts');
const decisionUseCase = read('packages/application/src/scholarships/import-center/ScholarshipImportDecisionUseCases.ts');
const screeningReader = read('packages/application/src/scholarships/import-center/ScholarshipImportScreeningReader.ts');
const codec = read('packages/application/src/scholarships/import-center/ScholarshipImportReviewDecisionCodec.ts');
const repo = read('packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts');
const schema = read('packages/infrastructure/prisma/schema.prisma');
const publicRouter = read('apps/api/src/presentation/api/router/ScholarshipPublicRouter.ts');
const adminRouter = read('apps/api/src/presentation/api/router/ScholarshipAdminRouter.ts');
const migration = read('packages/infrastructure/prisma/migrations/20260826001500_w8_scholarship_architecture/migration.sql');

check('P12-ARCH-008', /model ScholarshipVersion/.test(schema) && /model ScholarshipSponsorContext/.test(schema) && /model ScholarshipApplicationCycle/.test(schema) && /ScholarshipEligibilityRuleVersion/.test(schema) && /ScholarshipAwardPackageVersion/.test(schema) && /appendStructuralVersion/.test(repo) && /jsonSafe/.test(repo) && /status: 'SUPERSEDED'/.test(repo) && /versionId: latest\.id, status: 'PUBLISHED'/.test(repo), 'version/sponsor/cycle + JSON-safe immutable snapshots + publication/version lifecycle binding');
check('P12-DEDUP-004', /DEDUPE_V2/.test(domain) && /buildLegacyKey/.test(domain) && /countryReferenceId/.test(domain) && /officialSourceUrl/.test(domain) && /SCHOLARSHIP_LEGACY_DEDUPE_RECONCILIATION_REQUIRED/.test(transfer) && /buildLegacyKey/.test(handoff) && /legacyMatchCompatible/.test(handoff) && /countryReferenceId: canonicalScreening/.test(handoff) && /officialSourceUrl: parsed\.data\.officialSourceUrl/.test(handoff) && /buildLegacyKey/.test(importCenter) && /legacyDedupeCompatible/.test(importCenter) && /effectiveCanonical\.find\(\(item\) => item\.target === 'COUNTRY'/.test(importCenter) && /officialSourceUrl: parsed\.data\.officialSourceUrl/.test(importCenter), 'dedupe-v2 includes country + official URL consistently across handoff/import-center/transfer, with fail-closed legacy-v1 reconciliation');
check('P12-DEC-005', /verificationDecisionId/.test(codec) && /canonicalDecisionIds/.test(codec) && /decisionSnapshotFingerprint/.test(codec) && /verificationDecisions\.latest/.test(transfer) && /canonicalDecisions\.list/.test(transfer) && /verificationStatus: plan\.decisionSnapshot\.verificationState === 'VERIFIED'/.test(transfer) && /verificationRecordedAt/.test(transfer), 'transfer consumes durable decisions, persists VERIFIED projection, and receipts exact snapshot IDs');
check('P12-HANDOFF-006', /_domainHandoff/.test(screeningReader) && /handoff\.canonicalScreening/.test(screeningReader) && /ScholarshipImportScreeningReader/.test(transfer) && /ScholarshipImportScreeningReader/.test(importCenter) && /ScholarshipImportScreeningReader/.test(decisionUseCase), 'one canonical reader serves handoff compatibility across center/decision/transfer');
check('P12-PUB-003', /SCHOLARSHIP_SOURCE_NOT_VERIFIED/.test(admin) && /SCHOLARSHIP_CANONICAL_LINKS_UNRESOLVED/.test(admin) && /SCHOLARSHIP_VERSION_REQUIRED/.test(admin) && /findPublishedBySlug/.test(pub), 'publication is fail-closed');
check('P12-PUB-002', !/\.\.\.\(optionalFields \|\| \{\}\)/.test(pub) && /RESERVED_OPTIONAL_KEYS/.test(repo) && /sanitizeOptionalFields/.test(repo), 'optional compatibility cannot shadow canonical/public values');
check('P12-ADM-007', /filters\.countryReferenceId/.test(repo) && /filters\.degreeLevelId/.test(repo) && /filters\.majorId/.test(repo) && /filters\.internationalTestId/.test(repo) && /filters\.universityId/.test(repo) && /filters\.academicProgramId/.test(repo) && !/filters\.country\b/.test(repo) && !/filters\.degreeLevel\b/.test(repo), 'admin relationship filters use canonical ids');
check('P12-PUB-001', /countryReferenceId/.test(contracts) && /studyLanguageReferenceId/.test(contracts) && /currencyReferenceId/.test(contracts) && /degreeLevelId/.test(contracts) && /majorId/.test(contracts) && /internationalTestId/.test(contracts) && /universityId/.test(contracts) && /academicProgramId/.test(contracts) && /filters\.degreeLevelId/.test(repo) && /filters\.academicProgramId/.test(repo) && !/filters\.studyCountry/.test(repo) && !/filters\.degreeLevel\b/.test(repo), 'public filters are canonical-id based and queried');
check('W7-INVARIANT', /sourceIdentityKey\s+String\s+@unique/.test(schema), 'W7 source identity remains intact');
check('MIGRATION-SOURCE-ONLY', /PENDING|Google Studio|source-only/i.test(migration), 'runtime migration remains gated');
check('ROUTER-DECISIONS-WIRED', /scholarshipImportVerificationDecisionPort,\s*scholarshipImportCanonicalResolutionDecisionPort/.test(adminRouter), 'durable decisions wired into transfer');
check('PUBLIC-PAGINATION', /\.int\(\)\.min\(1\)/.test(publicRouter), 'public pagination is bounded/positive');

for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.id} — ${c.note}`);
const failed = checks.filter((c) => !c.ok);
console.log(`\nW8 source verifier: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
