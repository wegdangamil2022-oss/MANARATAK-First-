#!/usr/bin/env node
import fs from 'node:fs';
import { required, releaseVerdict } from './lib/ReleaseContracts.mjs';
import { acceptanceMatrix, businessCoverage } from './lib/AcceptanceContracts.mjs';
const sha = required('SOURCE_SHA'),
  inputFile = process.argv[2];
const supplied = inputFile
  ? JSON.parse(fs.readFileSync(inputFile, 'utf8'))
  : { gates: [], sectionBlockers: [] };
const index = {
  ...releaseVerdict(supplied, sha),
  kind: 'NON_AUTHORITATIVE_RELEASE_EVIDENCE_INDEX',
  signatureVerified: false,
  decision: 'BLOCKED',
  note: 'Indexing input cannot authorize promotion; independently signed source/runtime/approval envelopes are required.',
  domainMatrix: acceptanceMatrix(supplied.domainMatrix, sha),
  contentCoverage: businessCoverage(
    supplied.authority?.markets ?? [],
    supplied.businessCoverage ?? [],
    sha,
  ),
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('release-evidence', { recursive: true });
fs.writeFileSync('release-evidence/RELEASE_INDEX.json', JSON.stringify(index, null, 2) + '\n');
console.log(
  `RELEASE_EVIDENCE_INDEX=WRITTEN source=${index.sourceStatus} runtime=${index.runtimeStatus} decision=BLOCKED`,
);
