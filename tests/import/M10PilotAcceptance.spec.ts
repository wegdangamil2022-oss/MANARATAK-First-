import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { createM10PilotEvidenceTemplate, inspectM10PilotEvidence } from '../../scripts/import/M10PilotAcceptance';

describe('M10-15 connected acceptance evidence boundary', () => {
  it('starts with every actual pilot case untested and requires Tests first', () => {
    expect(JSON.parse(fs.readFileSync('workspace/pilot/m10-15/evidence-template.json', 'utf8'))).toEqual(createM10PilotEvidenceTemplate());
    const result = inspectM10PilotEvidence(createM10PilotEvidenceTemplate());
    expect(result).toMatchObject({ status: 'RUNTIME_UNTESTED', nextDomain: 'TESTS', databaseWrites: 0, runtimeAccepted: false });
    expect(result.openCases).toHaveLength(17);
  });
  const supplied = () => ({ ...createM10PilotEvidenceTemplate(), results: createM10PilotEvidenceTemplate().results.map(result => ({ ...result, status: 'PASS', evidenceKind: 'CONNECTED_RUNTIME', evidenceReference: `local-redacted-evidence/${result.caseId}`, observedAt: '2026-10-02T12:00:00Z', entityIds: ['00000000-0000-4000-8000-000000000001'] })) });
  it('never counts mocks as runtime acceptance even if every source assertion passed', () => {
    const evidence = supplied(); evidence.results = evidence.results.map(result => ({ ...result, evidenceKind: 'SOURCE_MOCK' }));
    expect(inspectM10PilotEvidence(evidence).openCases).toHaveLength(17);
  });
  it('requires references, observation and stable IDs for each runtime case', () => {
    const evidence = supplied(); evidence.results[0].entityIds = []; evidence.results[1].evidenceReference = ''; evidence.results[2].observedAt = null as unknown as string;
    expect(inspectM10PilotEvidence(evidence).openCases).toEqual(['TEST_SOURCE_PLAN', 'TEST_ADMIN_SAVE', 'TEST_VERSION_RETRY']);
  });
  it('does not automatically close M10 or authenticate a submitted bundle', () => {
    expect(inspectM10PilotEvidence(supplied())).toMatchObject({ openCases: [], runtimeAccepted: false, nextDomain: 'OPERATOR_EVIDENCE_REVIEW', status: 'EVIDENCE_SUBMITTED_REQUIRES_OPERATOR_VERIFICATION' });
  });
  it('keeps Majors pending after Tests, and rejects duplicate/stale/bulk case submissions', () => {
    const evidence = supplied(); evidence.results = evidence.results.filter(result => result.caseId.startsWith('TEST_'));
    expect(inspectM10PilotEvidence(evidence).nextDomain).toBe('MAJORS');
    expect(() => inspectM10PilotEvidence({ ...evidence, results: [...evidence.results, evidence.results[0]] })).toThrow('M10_PILOT_DUPLICATE_CASE');
    expect(() => inspectM10PilotEvidence({ ...evidence, protocolHash: 'f'.repeat(64) })).toThrow();
    expect(() => inspectM10PilotEvidence({ ...supplied(), results: [...supplied().results, supplied().results[0]] })).toThrow();
  });
});
