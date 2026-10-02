import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { z } from 'zod';
import { internationalTestImportEntrySchema, internationalTestSourceHash, prepareInternationalTestImport, type InternationalTestImportPlan } from '@manaratak/application';

const manifestPath = 'workspace/import-sources/international-tests/reconciliation/final_matching_data.json';
const sourcePath = 'workspace/import-sources/international-tests/unified-56';
const reviewSchema = z.object({
  schemaVersion: z.literal(1), changeSetId: z.string().uuid(), sourceManifestHash: z.string().regex(/^[a-f0-9]{64}$/),
  entries: z.array(internationalTestImportEntrySchema.omit({ rawContent: true })).min(1).max(5),
}).strict();
const manifestSchema = z.object({ matching_rows: z.array(z.object({
  filename: z.string(), folder: z.string(), classification: z.enum(['NEW_TEST', 'REPLACE_EXISTING', 'REVIEW_REQUIRED']),
})) });

async function readUtf8(file: string): Promise<string> {
  const bytes = await readFile(file);
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { throw new Error('TEST_IMPORT_SOURCE_ENCODING_INVALID'); }
}

async function sourceContext(workspace: string, expectedHash: string) {
  const content = await readUtf8(resolve(workspace, manifestPath));
  if (internationalTestSourceHash(content) !== expectedHash) throw new Error('TEST_IMPORT_MANIFEST_HASH_MISMATCH');
  const manifest = manifestSchema.parse(JSON.parse(content));
  const rows = new Map<string, string>();
  for (const row of manifest.matching_rows) {
    const key = `${row.folder}/${row.filename}`;
    if (rows.has(key)) throw new Error('TEST_IMPORT_MANIFEST_DUPLICATE_SOURCE');
    rows.set(key, row.classification);
  }
  return { rows, root: await realpath(resolve(workspace, sourcePath)) };
}
async function readReviewedSource(context: Awaited<ReturnType<typeof sourceContext>>, entry: z.infer<typeof reviewSchema>['entries'][number]) {
  if (context.rows.get(entry.sourceKey) !== entry.sourceClassification) throw new Error('TEST_IMPORT_SOURCE_CLASSIFICATION_MISMATCH');
  const file = await realpath(resolve(context.root, entry.sourceKey));
  const inside = relative(context.root, file);
  if (!inside || inside.startsWith('..') || isAbsolute(inside)) throw new Error('TEST_IMPORT_SOURCE_PATH_ESCAPE');
  const rawContent = await readUtf8(file);
  if (internationalTestSourceHash(rawContent) !== entry.sourceHash) throw new Error('TEST_IMPORT_SOURCE_HASH_MISMATCH');
  return rawContent;
}
export async function prepareReviewedTestImport(input: unknown, workspace: string): Promise<InternationalTestImportPlan> {
  const review = reviewSchema.parse(input);
  const context = await sourceContext(workspace, review.sourceManifestHash);
  const entries = [];
  for (const entry of review.entries) entries.push({ ...entry, rawContent: await readReviewedSource(context, entry) });
  return prepareInternationalTestImport({ ...review, entries, databaseWrites: 0 });
}
export async function verifyReviewedTestSources(plan: InternationalTestImportPlan, workspace: string): Promise<void> {
  const context = await sourceContext(workspace, plan.sourceManifestHash);
  for (const entry of plan.entries) {
    if (await readReviewedSource(context, entry) !== entry.rawContent) throw new Error('TEST_IMPORT_SOURCE_CONTENT_MISMATCH');
  }
}
