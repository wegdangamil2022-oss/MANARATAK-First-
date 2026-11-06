import { isDeepStrictEqual } from 'node:util';
import { Prisma, type PrismaClient } from '@prisma/client';

type Source = { id: string; payload: Record<string, unknown> };
type SourceRow = { data: Record<string, unknown>; sourceId: string; patch?: Record<string, unknown> };
const tables = {
  Major: { field: 'optionalFields', columns: ['id', 'publicId', 'slug', 'canonicalName', 'canonicalDedupKey', 'displayName', 'localizedNameAr', 'localizedNameEn', 'status', 'completenessStatus', 'facultyName', 'academicFieldId', 'disciplineId', 'optionalFields', 'createdAt', 'updatedAt'] },
  MajorVersion: { field: 'rawContentBlocks', columns: ['id', 'majorId', 'profileId', 'versionNumber', 'status', 'sourceImportRecordId', 'sourceFileName', 'sourceUri', 'sourceHash', 'importedAt', 'rawContentBlocks', 'changeSummary', 'metadata', 'createdAt', 'updatedAt'] },
  MajorImportOwnerReview: { field: 'payload', columns: ['id', 'receiptId', 'requestHash', 'payload', 'preview', 'previewHash', 'version', 'status', 'reviewer', 'reason', 'result', 'createdAt', 'updatedAt'] },
} as const;

/** Copies already verified source JSON inside the same transaction, rather than
 * uploading the same dossier again for each owner structure. No source is edited. */
export class VerifiedMajorSourceWriter {
  constructor(private readonly client: PrismaClient, private readonly sources: Source[]) {}
  async insert(table: keyof typeof tables, rows: SourceRow[]) {
    if (!rows.length) return;
    const config = tables[table];
    const values = rows.map(({ data, sourceId, patch = {} }) => {
      const source = this.sources.find(s => s.id === sourceId);
      const normalized = JSON.parse(JSON.stringify(data[config.field]));
      if (!source || !isDeepStrictEqual(normalized, { ...source.payload, ...patch })) throw Error('MAJOR_SOURCE_PROJECTION_MISMATCH');
      const base: Record<string, unknown> = { ...data, createdAt: data.createdAt ?? new Date(), updatedAt: data.updatedAt ?? new Date() };
      delete base[config.field];
      return { data: base, sourceId, patch };
    });
    // Identifiers come exclusively from the fixed table/column allowlist above.
    const identifier = (name: string) => Prisma.raw('"' + name + '"');
    const columns = config.columns.map(identifier);
    const changed = await this.client.$executeRaw(Prisma.sql`
      INSERT INTO ${identifier(table)} (${Prisma.join(columns)})
      SELECT ${Prisma.join(config.columns.map(c => Prisma.sql`projected.${identifier(c)}`))}
      FROM jsonb_array_elements(${JSON.stringify(values)}::jsonb) item(value)
      JOIN "ImportRecord" source ON source.id=item.value->>'sourceId'
      CROSS JOIN LATERAL jsonb_populate_record(NULL::${identifier(table)},
        (item.value->'data') || jsonb_build_object(${config.field},
          (source."rawPayload"->'_phase6HandoffEnvelope'->'normalizedPayload') || (item.value->'patch'))) projected`);
    if (changed !== rows.length) throw Error('MAJOR_SOURCE_PROJECTION_COUNT_MISMATCH');
  }
}
