import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
export const universityStage1Hash = (value) =>
  createHash('sha256')
    .update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value))
    .digest('hex');

// One bound JSON parameter avoids thousands of individual SQL parameters for
// retained raw rows and journal snapshots. Columns remain generated exclusively
// by this owner procedure; PostgreSQL applies the same constraints and defaults.
async function insertOwnerRows(tx, table, rows) {
  if (!rows.length) return;
  assert.ok(['University', 'UniversitySourceRecord', 'UniversityImportChange'].includes(table));
  rows = rows.map((row) => ({
    id: row.id ?? randomUUID(),
    ...row,
    ...(table === 'University' ? { updatedAt: new Date() } : {}),
  }));
  const keys = Object.keys(rows[0]);
  assert.ok(keys.every((key) => /^[a-zA-Z][a-zA-Z0-9]*$/.test(key)));
  assert.ok(rows.every((row) => JSON.stringify(Object.keys(row)) === JSON.stringify(keys)));
  if (typeof tx.copyUniversityImportRows === 'function') {
    const inserted = await tx.copyUniversityImportRows(table, keys, rows);
    assert.equal(inserted, rows.length);
    return;
  }
  const columns = keys.map((key) => '"' + key + '"').join(',');
  // Keep individual payloads below the remote transport's large-message cliff.
  // All chunks still share the same owner transaction and rollback boundary.
  let chunk = [],
    size = 2;
  const writes = [];
  const flush = () => {
    if (!chunk.length) return;
    writes.push(
      tx.$executeRawUnsafe(
        `INSERT INTO "${table}" (${columns}) SELECT ${columns} FROM jsonb_populate_recordset(NULL::"${table}",$1::jsonb)`,
        '[' + chunk.join(',') + ']',
      ),
    );
    chunk = [];
    size = 2;
  };
  for (const row of rows) {
    const json = JSON.stringify(row),
      bytes = Buffer.byteLength(json, 'utf8') + 1;
    assert.ok(bytes < 12_000, 'STAGE1_SOURCE_ROW_TOO_LARGE');
    if (size + bytes > 12_000) flush();
    chunk.push(json);
    size += bytes;
  }
  flush();
  const inserted = (await Promise.all(writes)).reduce((sum, count) => sum + count, 0);
  assert.equal(inserted, rows.length);
}

/** Stage 1 only: source identity, reviewed geography and complete raw fields.
 * Called within an authenticated/audited Serializable owner transaction after
 * offline workbook/plan verification and native source asset scanning. */
export async function persistUniversityStage1Batch(tx, batch, context) {
  assert.ok(context.actorId && /^[a-f0-9]{64}$/.test(context.planHash));
  assert.ok(batch.rows.length > 0 && batch.rows.length <= 500, 'STAGE1_BATCH_LIMIT');
  assert.equal(
    new Set(batch.rows.map((r) => r.publicId)).size,
    batch.rows.length,
    'DUPLICATE_SOURCE_ID',
  );
  const changeSetId =
    'stage1-full-' + universityStage1Hash(context.planHash + ':' + batch.index).slice(0, 40);
  await tx.$queryRawUnsafe(
    'SELECT pg_advisory_xact_lock(hashtextextended($1,0))::text',
    changeSetId,
  );
  const applied = await tx.universityImportChangeSet.findUnique({ where: { id: changeSetId } });
  if (applied) {
    assert.equal(applied.state, 'APPLIED');
    assert.equal(applied.sourceArtifactId, batch.fileHash);
    return { replayed: true, created: 0, preserved: 0, sources: 0 };
  }
  await tx.$queryRawUnsafe('SELECT id FROM "AssetRecord" WHERE id=$1 FOR SHARE', batch.assetId);
  const asset = await tx.assetRecord.findUnique({ where: { id: batch.assetId } });
  assert.ok(
    asset?.lifecycleState === 'ACTIVE' &&
      !asset.deletedAt &&
      !asset.purgedAt &&
      asset.securityClassification === 'INTERNAL' &&
      asset.checksumHash === batch.artifactHash,
    'SOURCE_ASSET_NOT_VERIFIED',
  );
  const existing = [];
  for (let offset = 0; offset < batch.rows.length; offset += 100) {
    const selected = batch.rows.slice(offset, offset + 100);
    existing.push(
      ...(await tx.university.findMany({
        where: {
          OR: [
            { publicId: { in: selected.map((r) => r.publicId) } },
            { slug: { in: selected.map((r) => r.publicId.toLowerCase()) } },
            { canonicalDedupKey: { in: selected.map((r) => r.publicId.toLowerCase()) } },
          ],
        },
      })),
    );
  }
  const sourceKeys = batch.rows.map((r) =>
    ['STAGE_1', batch.fileHash, r.sheet, 'row:' + r.row].join('|'),
  );
  for (let offset = 0; offset < sourceKeys.length; offset += 100)
    assert.equal(
      await tx.universitySourceRecord.count({
        where: { sourceIdentityKey: { in: sourceKeys.slice(offset, offset + 100) } },
      }),
      0,
      'SOURCE_RECEIPT_WITHOUT_BATCH',
    );
  const countries = [
      ...new Set(batch.rows.flatMap((r) => (r.countryReferenceId ? [r.countryReferenceId] : []))),
    ],
    regions = [
      ...new Set(batch.rows.flatMap((r) => (r.regionReferenceId ? [r.regionReferenceId] : []))),
    ],
    cities = [
      ...new Set(batch.rows.flatMap((r) => (r.cityReferenceId ? [r.cityReferenceId] : []))),
    ];
  for (const [table, ids] of [
    ['ReferenceCountry', countries],
    ['AdministrativeRegion', regions],
    ['ReferenceCity', cities],
  ])
    if (ids.length)
      await tx.$queryRawUnsafe(
        `SELECT id FROM "${table}" WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE`,
        ids,
      );
  const countryRows = await tx.referenceCountry.findMany({
      where: { id: { in: countries } },
      select: { id: true, iso2Code: true, iso3Code: true, isActive: true, lifecycleState: true },
    }),
    regionRows = await tx.administrativeRegion.findMany({
      where: { id: { in: regions } },
      select: {
        id: true,
        countryIso2Code: true,
        regionCode: true,
        isActive: true,
        lifecycleState: true,
      },
    }),
    cityRows = await tx.referenceCity.findMany({
      where: { id: { in: cities } },
      select: {
        id: true,
        countryIso2Code: true,
        administrativeRegionId: true,
        isActive: true,
        lifecycleState: true,
      },
    });
  const roots = [],
    sources = [],
    changes = [];
  let sequence = 0,
    preserved = 0;
  for (const row of batch.rows) {
    assert.ok(
      /^INS-[A-Z0-9-]+$/.test(row.publicId) && row.raw['Reference ID'] === row.publicId,
      'SOURCE_IDENTITY_MISMATCH',
    );
    assert.equal(universityStage1Hash(row.raw), row.rowHash, 'SOURCE_ROW_CHANGED');
    assert.ok(row.raw['Official English Name']?.trim(), 'UNIVERSITY_NAME_REQUIRED');
    const country = countryRows.find((r) => r.id === row.countryReferenceId),
      region = regionRows.find((r) => r.id === row.regionReferenceId),
      city = cityRows.find((r) => r.id === row.cityReferenceId);
    if (row.countryReferenceId)
      assert.ok(
        country?.isActive &&
          country.lifecycleState === 'ACTIVE' &&
          country.iso3Code === row.raw.ISO3,
        'COUNTRY_REFERENCE_CHANGED',
      );
    if (row.regionReferenceId)
      assert.ok(
        country &&
          region?.isActive &&
          region.lifecycleState === 'ACTIVE' &&
          region.countryIso2Code === country.iso2Code,
        'REGION_REFERENCE_CHANGED',
      );
    if (row.cityReferenceId)
      assert.ok(
        country &&
          city?.isActive &&
          city.lifecycleState === 'ACTIVE' &&
          city.countryIso2Code === country.iso2Code &&
          (!region || city.administrativeRegionId === region.id),
        'CITY_REFERENCE_CHANGED',
      );
    const prior = existing.find((r) => r.publicId === row.publicId);
    assert.ok(
      !existing.some(
        (r) =>
          r.publicId !== row.publicId &&
          (r.slug === row.publicId.toLowerCase() ||
            r.canonicalDedupKey === row.publicId.toLowerCase()),
      ),
      'UNIVERSITY_IDENTITY_COLLISION',
    );
    const id = prior?.id ?? row.targetId;
    assert.ok(id);
    if (prior) {
      assert.equal(prior.id, row.existingId, 'EXISTING_OWNER_CHANGED');
      preserved++;
    } else {
      assert.ok(!row.existingId, 'EXISTING_OWNER_DISAPPEARED');
      const root = {
        id,
        publicId: row.publicId,
        slug: row.publicId.toLowerCase(),
        canonicalDedupKey: row.publicId.toLowerCase(),
        canonicalName: row.raw['Official English Name'].trim(),
        displayName: row.raw['Official English Name'].trim(),
        country: row.raw.Country || null,
        city: row.raw.City || null,
        institutionType: row.raw['Institution Type'] || null,
        institutionalOwnership: row.raw.Ownership || null,
        officialWebsite: row.officialWebsite,
        officialSourceUrl: row.officialSourceUrl,
        countryReferenceId: row.countryReferenceId,
        regionReferenceId: row.regionReferenceId,
        cityReferenceId: row.cityReferenceId,
        status: row.geographyState === 'RESOLVED' ? 'READY_TO_REVIEW' : 'IMPORTED',
        completenessStatus: 'NEEDS_REVIEW',
        optionalFields: {
          stage1Review: {
            planHash: context.planHash,
            geographyState: row.geographyState,
            issues: row.issues,
            publication: false,
            stage2Imported: false,
          },
        },
      };
      roots.push(root);
      changes.push({
        changeSetId,
        universityId: id,
        entityType: 'UNIVERSITY',
        entityId: id,
        operation: 'CREATE',
        afterState: root,
        sequence: ++sequence,
      });
    }
    const source = {
      id: randomUUID(),
      sourceIdentityKey: ['STAGE_1', batch.fileHash, row.sheet, 'row:' + row.row].join('|'),
      universityId: id,
      stage: 'STAGE_1',
      sourceArtifactId: batch.fileHash,
      sourceRowNumber: row.row,
      sourceHash: row.rowHash,
      sourceUri: row.file + '#' + row.sheet + '!' + row.row,
      sourceLocale: 'en',
      importedAt: new Date(),
      metadata: {
        rawFields: row.raw,
        sourceSheet: row.sheet,
        sourceWorkbookSha256: batch.fileHash,
        sourceAssetId: batch.assetId,
        sourceAssetHash: batch.artifactHash,
        planHash: context.planHash,
        reviewedBy: context.actorId,
        geographyState: row.geographyState,
        issues: row.issues,
        existingUniversityPreserved: Boolean(prior),
      },
    };
    sources.push(source);
    changes.push({
      changeSetId,
      universityId: id,
      entityType: 'SOURCE_RECORD',
      entityId: source.id,
      operation: 'CREATE',
      afterState: JSON.parse(JSON.stringify(source)),
      sequence: ++sequence,
    });
  }
  await insertOwnerRows(tx, 'University', roots);
  await insertOwnerRows(tx, 'UniversitySourceRecord', sources);
  await tx.universityImportChangeSet.create({
    data: {
      id: changeSetId,
      sourceArtifactId: batch.fileHash,
      stage: 'STAGE_1',
      state: 'APPLIED',
      approvedBy: context.actorId,
      appliedAt: new Date(),
    },
  });
  await insertOwnerRows(tx, 'UniversityImportChange', changes);
  return { replayed: false, created: roots.length, preserved, sources: sources.length };
}
