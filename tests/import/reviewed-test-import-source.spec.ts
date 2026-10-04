import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { internationalTestSourceHash } from '@manaratak/application';
import { prepareReviewedTestImport, verifyReviewedTestSources } from '../../scripts/import/reviewed-test-import-source';
import { runReviewedTestImport } from '../../scripts/import_unified_tests_v2';
import { reviewBody } from '../../packages/application/tests/tests-platform/fixtures/reviewedTestImport';

const { clientConstructor } = vi.hoisted(() => ({ clientConstructor: vi.fn(() => { throw new Error('DATABASE_ACCESS_FORBIDDEN_IN_SOURCE_TEST'); }) }));
vi.mock('@prisma/client', () => ({ PrismaClient: clientConstructor }));
afterEach(() => { vi.restoreAllMocks(); clientConstructor.mockClear(); });

async function fixture() {
  // Keep ephemeral fixtures in the OS temp directory; no repository data changes.
  const root = await mkdtemp(join(tmpdir(), 'manaratak-tests-import-'));
  const manifestFile = join(root, 'workspace/import-sources/international-tests/reconciliation/final_matching_data.json');
  const sourceRoot = join(root, 'workspace/import-sources/international-tests/unified-56');
  await mkdir(join(root, 'workspace/import-sources/international-tests/reconciliation'), { recursive: true });
  await mkdir(join(sourceRoot, 'language'), { recursive: true });
  const { rawContent, ...entry } = reviewBody().entries[0];
  const manifest = JSON.stringify({ matching_rows: [{ folder: 'language', filename: 'Test_2026.md', classification: 'NEW_TEST', old_id: 'legacy-slug-is-not-an-account-id' }] });
  await writeFile(manifestFile, manifest);
  const sourceFile = join(sourceRoot, 'language/Test_2026.md');
  await writeFile(sourceFile, rawContent);
  const review = { schemaVersion: 1, changeSetId: reviewBody().changeSetId, sourceManifestHash: internationalTestSourceHash(manifest), entries: [entry] };
  const reviewFile = join(root, 'review.json'); const planFile = join(root, 'plan.json');
  await writeFile(reviewFile, JSON.stringify(review));
  return { root, sourceRoot, sourceFile, manifestFile, review, reviewFile, planFile, rawContent };
}
describe('locked source loader and offline CLI', () => {
  it('preserves reviewed UUIDs and exact raw source; legacy ids are never inferred', async () => {
    const f = await fixture(); const plan = await prepareReviewedTestImport(f.review, f.root);
    expect(plan.entries[0].targetId).toBe(f.review.entries[0].targetId);
    expect(plan.entries[0].rawContent).toBe(f.rawContent);
    await expect(verifyReviewedTestSources(plan, f.root)).resolves.toBeUndefined();
  });
  it('blocks changed manifest/source between prepare and later commands', async () => {
    const f = await fixture(); const plan = await prepareReviewedTestImport(f.review, f.root);
    await writeFile(f.sourceFile, `${f.rawContent}\nchanged`);
    await expect(verifyReviewedTestSources(plan, f.root)).rejects.toThrow('SOURCE_HASH_MISMATCH');
    await writeFile(f.manifestFile, '{}');
    await expect(verifyReviewedTestSources(plan, f.root)).rejects.toThrow('MANIFEST_HASH_MISMATCH');
  });
  it('requires exact locked classification and source hash', async () => {
    const f = await fixture();
    await expect(prepareReviewedTestImport({ ...f.review, entries: [{ ...f.review.entries[0], sourceClassification: 'REVIEW_REQUIRED' }] }, f.root)).rejects.toThrow('SOURCE_CLASSIFICATION_MISMATCH');
    await expect(prepareReviewedTestImport({ ...f.review, entries: [{ ...f.review.entries[0], sourceHash: 'f'.repeat(64) }] }, f.root)).rejects.toThrow('SOURCE_HASH_MISMATCH');
  });
  it('rejects invalid UTF-8 instead of hashing replacement characters', async () => {
    const f = await fixture(); await writeFile(f.sourceFile, Buffer.from([0xff, 0xfe]));
    await expect(prepareReviewedTestImport(f.review, f.root)).rejects.toThrow('SOURCE_ENCODING_INVALID');
  });
  it('rejects a directory junction/symlink escaping the approved source tree', async () => {
    const f = await fixture(); const external = await mkdtemp(join(tmpdir(), 'manaratak-source-outside-'));
    await writeFile(join(external, 'Test_2026.md'), f.rawContent);
    await symlink(external, join(f.sourceRoot, 'outside'), process.platform === 'win32' ? 'junction' : 'dir');
    const manifest = JSON.stringify({ matching_rows: [{ folder: 'outside', filename: 'Test_2026.md', classification: 'NEW_TEST' }] });
    await writeFile(f.manifestFile, manifest);
    await expect(prepareReviewedTestImport({ ...f.review, sourceManifestHash: internationalTestSourceHash(manifest), entries: [{ ...f.review.entries[0], sourceKey: 'outside/Test_2026.md' }] }, f.root)).rejects.toThrow('SOURCE_PATH_ESCAPE');
  });
  it('prepare and inspect do not construct a database client even with DATABASE_URL configured', async () => {
    const f = await fixture(); vi.spyOn(process, 'cwd').mockReturnValue(f.root); vi.spyOn(console, 'log').mockImplementation(() => {});
    const env = { DATABASE_URL: 'invalid-source-test-do-not-connect' };
    await runReviewedTestImport(['prepare', f.reviewFile, f.planFile], env);
    await runReviewedTestImport(['inspect', f.planFile], env);
    expect(JSON.parse(await readFile(f.planFile, 'utf8')).databaseWrites).toBe(0);
    expect(clientConstructor).not.toHaveBeenCalled();
    // An output must be new, to avoid silently replacing a reviewed plan.
    await expect(runReviewedTestImport(['prepare', f.reviewFile, f.planFile], env)).rejects.toThrow();
  });
  it('blocks legacy execute flags instead of simulating success', async () => {
    await expect(runReviewedTestImport(['--execute', 'ignored'])).rejects.toThrow('USAGE_INVALID');
    expect(clientConstructor).not.toHaveBeenCalled();
  });
  it('blocks missing approval and mutation gate before constructing Prisma', async () => {
    const f = await fixture(); vi.spyOn(process, 'cwd').mockReturnValue(f.root);
    const plan = await prepareReviewedTestImport(f.review, f.root); await writeFile(f.planFile, JSON.stringify(plan));
    const env = { TEST_IMPORT_ACTOR_ID: 'source-test-actor', DATABASE_URL: 'invalid-do-not-connect' };
    await expect(runReviewedTestImport(['approved-write', f.planFile], env)).rejects.toThrow('EXACT_APPROVAL');
    await expect(runReviewedTestImport(['approved-write', f.planFile], { ...env, TEST_IMPORT_APPROVAL: 'APPROVE_WRITE', TEST_IMPORT_APPROVAL_PLAN_HASH: plan.planHash, TEST_IMPORT_APPROVAL_PREVIEW_HASH: 'b'.repeat(64), DATABASE_RECOVERY_GATE_TOKEN: 'test-only', TEST_IMPORT_RECOVERY_EVIDENCE: 'recovery/test' })).rejects.toThrow('MUTATION_GATE_BLOCKED');
    expect(clientConstructor).not.toHaveBeenCalled();
  });
});
