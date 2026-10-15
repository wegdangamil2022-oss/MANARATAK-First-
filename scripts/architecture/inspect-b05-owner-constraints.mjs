import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const base = 'packages/infrastructure/prisma/migrations/';
const governance = [
  {
    migration: '20261010100000_tests_publication_governance',
    tables: [
      ['InternationalTestGovernance', 'testId', 'InternationalTest', 'id'],
      ['InternationalTestPublicationSnapshot', 'id', 'InternationalTestVersion', 'id'],
      ['InternationalTestPublicationSnapshot', 'testId', 'InternationalTest', 'id'],
      ['InternationalTestEvidenceHistory', 'testId', 'InternationalTest', 'id'],
    ],
    triggers: ['p9_publication_immutable', 'p9_evidence_immutable'],
  },
  {
    migration: '20261010120000_major_review_governance',
    tables: [
      ['NewMajorCandidateDecision', 'majorId', 'Major', 'id'],
      ['MajorPublicationSnapshot', 'versionId', 'MajorVersion', 'id'],
      ['MajorPublicationSnapshot', 'majorId', 'Major', 'id'],
      ['MajorPublicationSnapshot', 'profileId', 'MajorLevelProfile', 'id'],
    ],
    triggers: ['p10_candidate_decision_immutable', 'p10_publication_immutable'],
  },
];
export function inspectB05OwnerConstraints() {
  const constraints = [];
  const immutableTriggers = [];
  const files = [];
  for (const group of governance) {
    const file = base + group.migration + '/migration.sql',
      sql = read(file);
    files.push({ file, sha256: createHash('sha256').update(sql).digest('hex') });
    for (const [table, column, target, targetColumn] of group.tables) {
      const body =
        sql.match(new RegExp('CREATE TABLE "' + table + '" \\(([\\s\\S]*?)\\n\\);'))?.[1] ?? '';
      const pattern = new RegExp(
        '"' +
          column +
          '"[^,\\n]*REFERENCES "' +
          target +
          '"\\("' +
          targetColumn +
          '"\\) ON DELETE RESTRICT',
        'g',
      );
      const occurrences = [...body.matchAll(pattern)].length;
      if (occurrences !== 1)
        throw new Error('B05_GOVERNANCE_FK_SOURCE_DRIFT:' + table + '.' + column);
      constraints.push({
        table,
        column,
        target,
        targetColumn,
        onDelete: 'RESTRICT',
        occurrences,
        source: file,
        databaseStatus: 'UNKNOWN_NOT_QUERIED',
      });
    }
    for (const name of group.triggers) {
      if (
        !sql.includes('CREATE TRIGGER ' + name + ' BEFORE UPDATE OR DELETE') ||
        !sql.includes('RAISE EXCEPTION')
      )
        throw new Error('B05_IMMUTABILITY_SOURCE_DRIFT:' + name);
      immutableTriggers.push({ name, source: file, databaseStatus: 'UNKNOWN_NOT_QUERIED' });
    }
  }
  const schema = read('packages/infrastructure/prisma/schema.prisma');
  for (const model of ['ReferenceCurrency', 'ReferenceLanguage']) {
    const body = schema.match(new RegExp('model ' + model + ' \\{([\\s\\S]*?)\\n\\}'))?.[1] ?? '';
    if (!/isoCode\s+String\s+@unique/.test(body))
      throw new Error('B05_ISO_UNIQUENESS_REQUIRED:' + model);
  }
  return {
    version: 1,
    sourceOnly: true,
    databaseQueried: false,
    constraints,
    immutableTriggers,
    files,
    isoTargetsUniqueInPrisma: ['ReferenceCurrency.isoCode', 'ReferenceLanguage.isoCode'],
    proposedExpansionOnly: [
      'ReferenceCountry.defaultCurrencyCode -> ReferenceCurrency.isoCode',
      'ReferenceCountry.defaultLanguageCode -> ReferenceLanguage.isoCode',
      'ServiceProviderRecord.countryReferenceId -> ReferenceCountry.id',
      'StudentApplicationDocumentBinding.assetId -> AssetRecord.id (new source-only migration, NOT VALID, runtime pending)',
    ],
    pendingAssetMigration: {
      name: '20261015100000_student_document_asset_boundary',
      sha256: createHash('sha256')
        .update(read(base + '20261015100000_student_document_asset_boundary/migration.sql'))
        .digest('hex'),
      appliedByThisChange: false,
      existingOrphans: 'UNKNOWN_NOT_QUERIED',
      validation: 'NOT_VALID_UNTIL_REVIEWED_DATA_AUDIT',
    },
    legacyEvidenceOnly: ['Scholarship.amountCurrencyCode'],
    historicalSqlChanged: false,
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(inspectB05OwnerConstraints(), null, 2));
