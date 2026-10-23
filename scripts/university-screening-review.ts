import fs from 'node:fs/promises';
import { z } from 'zod';
import { reviewUniversityScreeningPlan, type UniversityScreeningPlan } from '@manaratak/application';

const decisionSchema = z.object({ previewPlanHash: z.string().regex(/^[a-f0-9]{64}$/), reviewedBy: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(2000), geography: z.array(z.object({
    sourceReferenceId: z.string().regex(/^INS-[A-Z0-9]+(?:-[A-Z0-9]+)+$/), countryReferenceId: z.string().uuid(),
    regionReferenceId: z.string().uuid(), cityReferenceId: z.string().uuid(),
  }).strict()).min(1).max(5) }).strict();

async function main() {
  const [previewFile, decisionFile, output, extra] = process.argv.slice(2);
  if (!previewFile || !decisionFile || !output || extra) throw new Error('UNIVERSITY_SOURCE_REVIEW_INPUT_REQUIRED');
  const files = await Promise.all([previewFile, decisionFile].map(file => fs.readFile(file)));
  if (files.some(bytes => bytes.length > 256 * 1024)) throw new Error('UNIVERSITY_SOURCE_REVIEW_INPUT_TOO_LARGE');
  const preview = JSON.parse(files[0].toString('utf8')) as UniversityScreeningPlan;
  const decision = decisionSchema.parse(JSON.parse(files[1].toString('utf8')));
  const plan = reviewUniversityScreeningPlan(preview, decision);
  await fs.writeFile(output, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ state: 'REVIEWED_PLAN_PREPARED', planHash: plan.planHash, changes: plan.changes.length, databaseWrites: 0,
    commitRequires: 'CURRENT_AUTHORIZATION_SOURCE_RECHECK_RECOVERY_AND_EXACT_PLAN_APPROVAL' }));
}
main().catch(error => {
  console.error(error instanceof Error && /^UNIVERSITY_[A-Z_]+$/.test(error.message) ? error.message : 'UNIVERSITY_SOURCE_REVIEW_FAILED_REDACTED');
  process.exitCode = 1;
});
