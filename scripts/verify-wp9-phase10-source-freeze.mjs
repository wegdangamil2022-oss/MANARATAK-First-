import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const majors = read('packages/domain/src/majors/majors.ts');
const repository = read('packages/infrastructure/src/majors/PrismaMajorRepository.ts');
const readiness = read('packages/domain/src/majors/MajorPublicationReadinessPolicy.ts');
const phase11 = read('packages/domain/src/majors/Phase11MajorConsumptionContract.ts');

const reservedMatch = repository.match(/MAJOR_OPTIONAL_FIELDS_RESERVED_KEYS\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
if (!reservedMatch) throw new Error('Major optionalFields reserved-key policy was not found.');
const reservedKeys = [...reservedMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
const requiredReservedKeys = [
  'id', 'publicId', 'slug', 'canonicalName', 'canonicalDedupKey', 'displayName',
  'status', 'completenessStatus', 'academicFieldId', 'disciplineId',
  'currentPublishedVersionId', 'profiles', 'classificationMappings', 'relationships',
  'sources', 'createdAt', 'updatedAt',
];

const report = {
  optionalFieldsMissingReservedKeys: requiredReservedKeys.filter((key) => !reservedKeys.includes(key)),
  canonicalColumnsAppliedAfterOptionalFields: /return\s*\{\s*\.\.\.safeOptionalFields,\s*\.\.\.rest,/s.test(repository),
  duplicateDegreeSsot: /export\s+(?:interface|class)\s+DegreeLevel\b/.test(majors) ? 1 : 0,
  majorLevelIsPhase8Subset: /MajorLevel\s*=\s*Extract<CanonicalDegreeLevelCode/.test(majors),
  phase10OwnedTaxonomySsot: /export\s+(?:interface|class)\s+(?:AcademicTaxonomy|TaxonomyNode)\b/.test(majors) ? 1 : 0,
  gapTaxonomyBlocksCompleteness: majors.includes("reviewFields.push('GAP_TAXONOMY_TRUE')"),
  sourceOwnerInvariant: repository.includes("assertHasOwner(data.majorId, data.profileId, 'MajorSource')"),
  classificationOwnerAndTaxonomyInvariants: repository.includes("assertHasOwner(mapping.majorId, mapping.profileId, 'MajorClassificationMapping')") && repository.includes('MajorClassificationMapping requires taxonomyNodeId'),
  relationshipOwnerSelfDuplicateInvariants: repository.includes("'MajorRelationship source'") && repository.includes("'MajorRelationship target'") && repository.includes('MajorRelationship cannot target itself') && repository.includes('Duplicate semantic MajorRelationship'),
  centralPublicationReadiness: readiness.includes('MAJOR_CANONICAL_DEGREE_REFERENCE_MISSING') && readiness.includes('MAJOR_CANONICAL_TAXONOMY_REFERENCE_MISSING') && readiness.includes('MAJOR_SOURCE_IDENTITY_MISSING'),
  phase11RequiresCanonicalIds: phase11.includes('CANONICAL_MAJOR_ID_REQUIRED') && phase11.includes('CANONICAL_DEGREE_LEVEL_ID_REQUIRED'),
  phase11DuplicatesMajorIdentity: /(?:canonicalMajorName|canonicalDedupKey|generatedMajorId|createMajor)/.test(phase11),
  freezeDocumentPresent: fs.existsSync(path.join(root, 'docs/phases/phase-10-majors/PHASE_10_FINAL_FREEZE_AND_HANDOFF.md')),
  wp9RegisterPresent: fs.existsSync(path.join(root, 'docs/remediation/wp9/WP9_PHASE_10_RISK_AND_DEVIATION_REGISTER.md')),
};

console.log(JSON.stringify(report, null, 2));
if (
  report.optionalFieldsMissingReservedKeys.length || !report.canonicalColumnsAppliedAfterOptionalFields ||
  report.duplicateDegreeSsot || !report.majorLevelIsPhase8Subset || report.phase10OwnedTaxonomySsot ||
  !report.gapTaxonomyBlocksCompleteness || !report.sourceOwnerInvariant ||
  !report.classificationOwnerAndTaxonomyInvariants || !report.relationshipOwnerSelfDuplicateInvariants ||
  !report.centralPublicationReadiness || !report.phase11RequiresCanonicalIds ||
  report.phase11DuplicatesMajorIdentity || !report.freezeDocumentPresent || !report.wp9RegisterPresent
) process.exitCode = 1;
