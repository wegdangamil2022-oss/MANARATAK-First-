// Read-only catalog proof. Prisma schema parity alone is not proof of this flag.
export async function readAdmissionIdentityIndex(db) {
  const rows = await db.$queryRawUnsafe(`SELECT i.indisunique AS "unique", i.indisvalid AS valid,
    i.indisready AS ready, i.indnullsnotdistinct AS "nullsNotDistinct",
    i.indpred IS NULL AS unrestricted, i.indexprs IS NULL AS "plainColumns",
    i.indnkeyatts AS "keyCount", i.indnatts AS "columnCount",
    ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY k(attnum, position)
      JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum ORDER BY k.position) AS columns
    FROM pg_index i WHERE i.indexrelid=to_regclass('public."UniversityProgramAdmissionRequirement_identity_key"')
      AND i.indrelid='public."UniversityProgramAdmissionRequirement"'::regclass`);
  return rows[0] ?? null;
}

export async function assertAdmissionNullIdentity(db) {
  const index = await readAdmissionIdentityIndex(db);
  if (!index?.unique || !index.valid || !index.ready || !index.nullsNotDistinct ||
      !index.unrestricted || !index.plainColumns || index.keyCount !== 4 || index.columnCount !== 4 ||
      JSON.stringify(index.columns) !== JSON.stringify(['academicProgramId','internationalTestId','testVariantId','testVersionId'])) {
    throw new Error('ADMISSION_NULL_IDENTITY_DATABASE_GUARD_MISSING');
  }
  return index;
}
