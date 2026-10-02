import { z } from 'zod';
import { sourceReviewHash } from '../../packages/application/src/import-foundation/services/CanonicalSourceReview';

export const m10PilotCases = [
  { id: 'TEST_SOURCE_PLAN', domain: 'TESTS', expectation: 'Reviewed 1–5 item sealed plan; raw/hash/cycle preserved; no inferred current UUID.' },
  { id: 'TEST_ADMIN_SAVE', domain: 'TESTS', expectation: 'Real Admin save → authorized CSRF/idempotency API → stable persisted Test ID.' },
  { id: 'TEST_VERSION_RETRY', domain: 'TESTS', expectation: 'Version receipt/source fingerprint matches; same plan retry makes zero writes; previous versions remain.' },
  { id: 'TEST_SCORE_POLICY', domain: 'TESTS', expectation: 'Reviewed version/score/pass-fail policy persists; finite bounds, positive optional increment; no guessed equivalency.' },
  { id: 'TEST_CANONICAL_MISMATCH', domain: 'TESTS', expectation: 'Missing/foreign provider, incompatible family and reference mismatches rejected with zero business writes.' },
  { id: 'TEST_PERMISSION_DENIED', domain: 'TESTS', expectation: 'Student/unverified actor/employee lacking permission denied; existing student session retained.' },
  { id: 'TEST_TRANSACTION_FAILURE', domain: 'TESTS', expectation: 'Mid-write and audit/outbox failure roll back the whole transaction; no partial rows.' },
  { id: 'TEST_PUBLIC_SMOKE', domain: 'TESTS', expectation: 'Draft is hidden; authorized reviewed publication is visible by stable slug; archive hides it again.' },
  { id: 'TEST_RECONCILE_AUDIT', domain: 'TESTS', expectation: 'Read-after-write, receipt/audit/outbox, duplicate/orphan/ID drift checks pass; compensating rollback preserves raw source.' },
  { id: 'MAJOR_ADMIN_SAVE', domain: 'MAJORS', expectation: 'Only after Test acceptance: real Admin save → owner API → stable Major/source public ID.' },
  { id: 'MAJOR_CANONICAL_PROFILE', domain: 'MAJORS', expectation: 'Same profile has verified DegreeLevel and taxonomy; refresh and filters retain the exact IDs.' },
  { id: 'MAJOR_FOREIGN_PROFILE', domain: 'MAJORS', expectation: 'Foreign owner profile, inactive taxonomy and incompatible degree references rejected without mutation.' },
  { id: 'MAJOR_PERMISSION_DENIED', domain: 'MAJORS', expectation: 'Student/employee without Major permission denied; no privileged write or identity regeneration.' },
  { id: 'MAJOR_VERSION_RETRY', domain: 'MAJORS', expectation: 'Source/version identities stable; reviewed same-source retry creates no duplicate accepted owner/profile.' },
  { id: 'MAJOR_TRANSACTION_FAILURE', domain: 'MAJORS', expectation: 'Profile/mapping and audit failure rolls back the owner mutation; previous versions remain.' },
  { id: 'MAJOR_PUBLIC_SMOKE', domain: 'MAJORS', expectation: 'Draft hidden; reviewed publish/read/archive works in Public with canonical degree/taxonomy filters.' },
  { id: 'MAJOR_RECONCILE_AUDIT', domain: 'MAJORS', expectation: 'Accepted owner/profile orphan/duplicate/ID drift = 0; audit/outbox matches actual owner operation.' },
] as const;
export const m10PilotProtocolHash = sourceReviewHash(m10PilotCases);
const evidenceSchema = z.object({
  protocolHash: z.literal(m10PilotProtocolHash),
  results: z.array(z.object({ caseId: z.enum(m10PilotCases.map(item => item.id) as [typeof m10PilotCases[number]['id'], ...typeof m10PilotCases[number]['id'][]]), status: z.enum(['RUNTIME_UNTESTED', 'PASS', 'FAIL', 'BLOCKED']), evidenceKind: z.enum(['NONE', 'SOURCE_MOCK', 'CONNECTED_RUNTIME']), evidenceReference: z.string().trim().max(500).nullable(), observedAt: z.string().datetime().nullable(), entityIds: z.array(z.string().uuid()).max(5) }).strict()).max(m10PilotCases.length),
}).strict();

/** Structural evidence gate only: it neither runs a pilot nor proves submitted
 * evidence authentic. Source/mock evidence can never close connected acceptance. */
export function inspectM10PilotEvidence(input: unknown) {
  const evidence = evidenceSchema.parse(input);
  if (new Set(evidence.results.map(item => item.caseId)).size !== evidence.results.length) throw new Error('M10_PILOT_DUPLICATE_CASE');
  const results = new Map(evidence.results.map(item => [item.caseId, item]));
  const openCases = m10PilotCases.filter(item => {
    const result = results.get(item.id);
    return !result || result.status !== 'PASS' || result.evidenceKind !== 'CONNECTED_RUNTIME' || !result.evidenceReference || !result.observedAt || !result.entityIds.length;
  }).map(item => item.id);
  const testsOpen = openCases.some(id => id.startsWith('TEST_'));
  return { protocolHash: m10PilotProtocolHash, status: openCases.length ? 'RUNTIME_UNTESTED' : 'EVIDENCE_SUBMITTED_REQUIRES_OPERATOR_VERIFICATION', nextDomain: testsOpen ? 'TESTS' : openCases.length ? 'MAJORS' : 'OPERATOR_EVIDENCE_REVIEW', openCases, databaseWrites: 0, runtimeAccepted: false, policy: 'NO_AUTOMATIC_M10_CLOSURE; UI_HTTP_DB_AND_AUDIT_EVIDENCE_MUST_BE_AUTHENTICATED_IN_CONNECTED_ENVIRONMENT' };
}
export function createM10PilotEvidenceTemplate() {
  return { protocolHash: m10PilotProtocolHash, results: m10PilotCases.map(item => ({ caseId: item.id, status: 'RUNTIME_UNTESTED', evidenceKind: 'NONE', evidenceReference: null, observedAt: null, entityIds: [] })) };
}
