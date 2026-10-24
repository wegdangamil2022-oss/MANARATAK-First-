import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readXlsxWorkbook } from '@manaratak/shared';
import type { UniversityStageEvidence, UniversityStageEvidenceReader } from '@manaratak/domain';
import { UNIVERSITY_STAGE_CARDS } from '@manaratak/domain';
import catalog from './UniversityStageSourceCatalog';
type SourceRow = { row: number; fields: Record<string, unknown> };
type Artifact = (typeof catalog)[number];
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
/** Reads only pinned repository artifacts. No user path, URL fetching, source modification or identity guessing. */
export class UniversityStageSourceReader implements UniversityStageEvidenceReader {
  private readonly cache = new Map<string, Promise<Map<string, SourceRow>>>();
  constructor(private readonly root = process.cwd()) {}
  private rows(artifact: Artifact): Promise<Map<string, SourceRow>> {
    const old = this.cache.get(artifact.sha256);
    if (old) return old;
    const pending = (async () => {
      const file = path.resolve(this.root, artifact.sourcePath);
      if (
        !file.startsWith(
          path.resolve(this.root, 'workspace/import-sources/universities') + path.sep,
        )
      )
        throw Error('SOURCE_PATH_INVALID');
      const bytes = await fs.readFile(file);
      if (createHash('sha256').update(bytes).digest('hex') !== artifact.sha256)
        throw Error('SOURCE_HASH_CHANGED');
      const result = new Map<string, SourceRow>();
      if (artifact.stage < 3) {
        const book = await readXlsxWorkbook(bytes),
          sheet = book.sheets.get(artifact.sheetName!);
        if (!sheet) throw Error('SOURCE_SHEET_UNAVAILABLE');
        const headers = artifact.headers!;
        const actual = sheet.textRows[artifact.headerRow!]?.map((v) => String(v ?? '').trim());
        if (JSON.stringify(actual) !== JSON.stringify(headers))
          throw Error('SOURCE_HEADERS_CHANGED');
        sheet.textRows.slice(artifact.headerRow! + 1).forEach((values, index) => {
          const id = String(values[0] ?? '').trim();
          if (!id) return;
          if (result.has(id)) throw Error('SOURCE_DUPLICATE_IDENTITY');
          result.set(id, {
            row: artifact.headerRow! + index + 2,
            fields: Object.fromEntries(headers.map((h, i) => [h, values[i] ?? null])),
          });
        });
      } else {
        let current: SourceRow | undefined,
          id = '';
        for (const [index, line] of bytes.toString('utf8').split(/\r?\n/).entries()) {
          const heading = /^## \d{4} — (INS-[A-Z0-9-]+)\s*$/.exec(line);
          if (heading) {
            id = heading[1];
            if (result.has(id)) throw Error('SOURCE_DUPLICATE_IDENTITY');
            current = { row: index + 1, fields: {} };
            result.set(id, current);
            continue;
          }
          const field = /^- \*\*(.+?):\*\*\s*(.*)$/.exec(line);
          if (current && field) current.fields[field[1]] = field[2].trim();
        }
        for (const [key, row] of result)
          if (row.fields['University Reference ID'] !== key)
            throw Error('SOURCE_IDENTITY_MISMATCH');
      }
      return result;
    })();
    this.cache.set(artifact.sha256, pending);
    pending.catch(() => this.cache.delete(artifact.sha256));
    return pending;
  }
  async read(
    publicId: string,
    sources: unknown[],
    geography?: { region?: string | null; subregion?: string | null },
  ): Promise<UniversityStageEvidence[]> {
    const matches: Artifact[] = [];
    const unavailable = new Set<string>();
    for (const artifact of catalog.filter((a) => a.stage === 1)) {
      try {
        if ((await this.rows(artifact)).has(publicId)) matches.push(artifact);
      } catch {
        unavailable.add(artifact.continent);
      }
    }
    const region = geography?.region,
      subregion = geography?.subregion;
    const geographicContinent =
      region === 'Americas'
        ? subregion === 'South America'
          ? 'South America'
          : ['Northern America', 'Central America', 'Caribbean'].includes(subregion ?? '')
            ? 'North America'
            : null
        : ['Europe', 'Africa', 'Asia', 'Oceania'].includes(region ?? '')
          ? region!
          : null;
    const continent = matches.length === 1 ? matches[0].continent : geographicContinent;
    const evidence: UniversityStageEvidence[] = [];
    for (let stage = 1; stage <= 5; stage++) {
      const artifact = catalog.find((a) => a.stage === stage && a.continent === continent);
      const row: UniversityStageEvidence = {
        stage,
        continent: continent ?? null,
        sourceState: stage === 5 || (continent && !artifact) ? 'NOT_SUPPLIED' : 'UNAVAILABLE',
        importState: 'UNKNOWN',
        fields: {},
        issues: [],
      };
      if (matches.length > 1) row.issues.push('SOURCE_IDENTITY_AMBIGUOUS');
      if (artifact) {
        row.sourceFile = artifact.sourcePath;
        row.sourceHash = artifact.sha256;
        try {
          const source = (await this.rows(artifact)).get(publicId);
          row.sourceState = 'AVAILABLE';
          if (source && matches.length <= 1) {
            row.fields = Object.fromEntries(
              UNIVERSITY_STAGE_CARDS.filter((c) => c.stage === stage).flatMap((c) =>
                c.fields.map((f) => [f.source, source.fields[f.source] ?? null]),
              ),
            );
            row.sourceRow = source.row;
          } else if (!source) row.issues.push('SOURCE_IDENTITY_NOT_FOUND_IN_ARTIFACT');
        } catch {
          row.issues.push('SOURCE_ARTIFACT_UNAVAILABLE_OR_CHANGED');
        }
        const proof = sources
          .map(object)
          .filter(
            (s) =>
              s.stage === (stage === 5 ? 'GLOBAL_RANKINGS' : 'STAGE_' + stage) &&
              s.sourceArtifactId === artifact.sha256 &&
              s.importedAt,
          )
          .sort((a, b) => Date.parse(String(b.importedAt)) - Date.parse(String(a.importedAt)))[0];
        if (proof) {
          row.importState = 'IMPORTED';
          row.importedAt = String(proof.importedAt);
          row.sourceRecordId = String(proof.id);
        }
      }
      if (stage === 3) {
        if (
          String(row.fields['Key Majors'] ?? '')
            .split('|')
            .filter(Boolean).length > 8
        )
          row.issues.push('KEY_MAJORS_LIMIT_EXCEEDED');
        for (const item of String(row.fields['Key International Scholarships'] ?? '')
          .split('|')
          .filter(Boolean)) {
          const [name, url] = item.split('::').map((x) => x.trim());
          if (!name || !safeUniversityUrl(url)) row.issues.push('INVALID_SCHOLARSHIP_REFERENCE');
        }
      }
      if (
        stage === 4 &&
        /^no$/i.test(String(row.fields['Is University Accommodation Available?'] ?? '').trim()) &&
        [
          'Typical Accommodation Cost',
          'Accommodation Cost Currency',
          'Are International Students Eligible for Accommodation?',
        ].some(
          (k) =>
            row.fields[k] !== null &&
            row.fields[k] !== undefined &&
            String(row.fields[k]).trim() !== '',
        )
      )
        row.issues.push('ACCOMMODATION_DETAILS_NOT_APPLICABLE');
      evidence.push(row);
    }
    return evidence;
  }
}
function safeUniversityUrl(value: unknown) {
  try {
    const u = new URL(String(value));
    return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password;
  } catch {
    return false;
  }
}
