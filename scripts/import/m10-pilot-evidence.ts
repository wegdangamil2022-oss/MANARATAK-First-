import fs from 'node:fs';
import { createM10PilotEvidenceTemplate, inspectM10PilotEvidence } from './M10PilotAcceptance';

const [mode, inputPath] = process.argv.slice(2);
try {
  if (mode === 'template' && !inputPath && process.argv.length === 3) console.log(JSON.stringify(createM10PilotEvidenceTemplate(), null, 2));
  else if (mode === 'inspect' && inputPath && process.argv.length === 4) {
    const size = fs.statSync(inputPath).size;
    if (size > 100_000) throw new Error('M10_PILOT_EVIDENCE_TOO_LARGE');
    console.log(JSON.stringify(inspectM10PilotEvidence(JSON.parse(fs.readFileSync(inputPath, 'utf8'))), null, 2));
  } else throw new Error('M10_PILOT_ARGUMENTS_INVALID');
} catch {
  // Never echo arbitrary input values, JSON excerpts or filesystem error details.
  console.error('M10_PILOT_EVIDENCE_INVALID_OR_UNREADABLE');
  process.exitCode = 1;
}
