import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PrismaClient, type Prisma } from '@prisma/client';
import {
  ScholarshipCompletenessClassifier,
  ScholarshipCompletenessState,
  ScholarshipDeduplicationService,
  ScholarshipPublicationStatus,
  ScholarshipStatus,
  ScholarshipVerificationStatus,
} from '@manaratak/domain';
import { AdminScholarshipUseCases } from '../../packages/application/src/scholarships/use-cases/AdminScholarshipUseCases';
import { PublicScholarshipUseCases } from '../../packages/application/src/scholarships/use-cases/PublicScholarshipUseCases';
import { AtomicAuditedOutboxMutationExecutor } from '../../packages/application/src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';
import { AtomicDomainMutationCoordinator } from '../../packages/application/src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { PrismaAuditRecordRepository } from '../../packages/infrastructure/src/audit/PrismaAuditRecordRepository';
import { PrismaTransactionalOutboxStore } from '../../packages/infrastructure/src/event-foundation/PrismaTransactionalOutboxStore';
import { PrismaScholarshipRepository } from '../../packages/infrastructure/src/scholarships/PrismaScholarshipRepository';
import { PrismaScholarshipCanonicalLookupGateway } from '../../packages/infrastructure/src/scholarships/PrismaScholarshipCanonicalLookupGateway';
import { requireDatabaseMutationGate } from '../lib/database-mutation-gate.mjs';

interface Program {
  slug: string;
  title: string;
  titleEn: string;
  provider: string;
  country: string;
  countryCode: string;
  source: string;
  application: string;
  ownerVerified?: boolean;
  description: string;
  degrees: string[];
  funding: string;
  coverage: string;
  eligibility: string[];
  documents: string[];
  benefits?: Partial<Record<'FULL' | 'PARTIAL', string[]>>;
  studyOptions?: Array<{ language: 'zh' | 'en'; institution: string; programs: string[] }>;
}
interface Manifest {
  templateCommit: string;
  observedOn: string;
  programs: Program[];
  existingMatches: string[];
}

export async function runManaratak22Scholarships(db: PrismaClient, mode: 'check' | 'rehearse' | 'apply') {
  if (mode !== 'check') {
    const gate = requireDatabaseMutationGate('manaratak22-scholarships', { allowedPurposes: ['import'] });
    assert.equal(gate.environment, 'development');
  }
  const url = new URL(process.env.DATABASE_URL ?? '');
  assert.match(url.hostname, /^ep-floral-frost-b92kj594(?:-pooler)?\.c-7\.eu-central-1\.aws\.neon\.tech$/);
  assert.equal(url.pathname, '/neondb');
  assert.equal(url.username, 'manaratak_app');
  assert.equal(url.searchParams.get('sslmode'), 'require');
  const [identity] = await db.$queryRaw<Array<{ role: string; database: string; oid: number; elevated: boolean }>>`
    SELECT current_user::text AS role, current_database()::text AS database, d.oid::int AS oid,
      (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolbypassrls) AS elevated
    FROM pg_database d JOIN pg_roles r ON r.rolname = current_user WHERE datname = current_database()
  `;
  assert.deepEqual(identity, { role: 'manaratak_app', database: 'neondb', oid: 16395, elevated: false });
  const manifestPath = '../../workspace/import-sources/scholarships/manaratak22-programs.json';
  const bytes = await readFile(new URL(manifestPath, import.meta.url));
  const manifest: Manifest = JSON.parse(bytes.toString('utf8'));
  const sourceHash = createHash('sha256').update(bytes).digest('hex');

  async function prepare(tx: Prisma.TransactionClient, program: Program) {
    const country = await tx.referenceCountry.findFirstOrThrow({
      where: { iso2Code: program.countryCode, isActive: true, lifecycleState: 'ACTIVE' },
    });
    const degrees = await tx.degreeLevel.findMany({
      where: { canonicalCode: { in: program.degrees }, status: 'ACTIVE' },
    });
    assert.equal(degrees.length, program.degrees.length, 'SCHOLARSHIP_DEGREE_REFERENCE_MISSING');
    assert.ok(!program.slug.startsWith('design-demo-'));
    for (const link of [program.source, program.application]) {
      const target = new URL(link);
      assert.equal(target.protocol, 'https:');
      assert.ok(!target.username && !target.password);
    }
    const deadlineType = 'NOT_STATED_IN_SOURCE';
    const degreeLevel = program.degrees.map(code => degrees.find(level => level.canonicalCode === code)!.nameAr).join('، ');
    const completeness = ScholarshipCompletenessClassifier.classify({
      displayName: program.title, providerName: program.provider, officialSourceUrl: program.source,
      studyCountry: program.country, degreeLevel, fundingCoverage: program.funding,
      coverageDetails: program.coverage, eligibilityCriteria: program.eligibility.join('\n'),
      requiredDocuments: program.documents.join('\n'), metadata: { deadlineType },
    });
    assert.equal(completeness.state, ScholarshipCompletenessState.COMPLETE, 'SCHOLARSHIP_TEMPLATE_SOURCE_NOT_COMPLETE');

    return {
      publicId: 'sch_' + createHash('sha256').update('manaratak22:' + program.slug).digest('hex').slice(0, 20),
      slug: program.slug,
      canonicalName: program.title,
      displayName: program.title,
      canonicalDedupKey: ScholarshipDeduplicationService.buildKey({
        cleanedScholarshipName: program.title, providerName: program.provider,
        countryReferenceId: country.id, officialSourceUrl: program.source,
      }).duplicateKey,
      providerName: program.provider,
      officialSourceUrl: program.source,
      applicationUrl: program.application,
      sourceLocale: 'ar',
      countryReferenceId: country.id,
      countrySourceLabel: program.country,
      studyCountry: program.country,
      degreeLevel,
      deadlineType,
      applicationDeadline: null,
      verificationStatus: ScholarshipVerificationStatus.VERIFIED,
      completenessStatus: completeness.state,
      status: ScholarshipStatus.READY_TO_REVIEW,
      publicationStatus: ScholarshipPublicationStatus.DRAFT,
      fundingCoverage: program.funding,
      coverageDetails: program.coverage,
      ...(program.funding === 'ممولة بالكامل' ? { isFullyFunded: true, fundingTypeCode: 'FULLY_FUNDED' } : {}),
      eligibilityCriteria: program.eligibility.join('\n'),
      requiredDocuments: program.documents.join('\n'),
      lastVerifiedAt: new Date(manifest.observedOn),
      optionalFields: {
        description: program.description,
        localizedNames: { ar: program.title, en: program.titleEn },
        ...(program.studyOptions ? { publishedStudyOptions: program.studyOptions } : {}),
      },
      benefits: Object.entries(program.benefits ?? {}).flatMap(([coverageTypeCode, items]) => items.map((valueText, index) => ({
        benefitKey: coverageTypeCode.toLowerCase() + '-' + index,
        benefitTypeCode: 'OTHER', coverageTypeCode, valueText, displayOrder: index,
      }))),
      degreeTargets: degrees.map(level => ({
        targetKey: level.canonicalCode, degreeLevelId: level.id, sourceLabel: level.nameAr, resolutionStatus: 'RESOLVED',
      })),
      sourceEvidence: [{
        evidenceKey: 'manaratak22-program-source',
        sourceTypeCode: 'OFFICIAL_WEBSITE',
        sourceUrl: program.source,
        sourceName: program.provider,
        sourceHash,
        isOfficial: true,
        verifiedAt: new Date(manifest.observedOn),
        metadata: {
          templateCommit: manifest.templateCommit,
          verificationBasis: program.ownerVerified ? 'OWNER_CONFIRMED_TEMPLATE' : 'OFFICIAL_PROGRAM_SOURCE',
        },
      }],
    };
  }

  const repository = new PrismaScholarshipRepository(db);
  const reader = new PublicScholarshipUseCases(repository);
  const existing = [];
  for (const publicId of manifest.existingMatches) {
    const record = await db.scholarship.findUniqueOrThrow({ where: { publicId } });
    const checked = await new AdminScholarshipUseCases(repository).getScholarshipCatalogDetail(record.id);
    existing.push({ publicId, slug: record.slug, readiness: checked.publicationReadiness, unresolvedLinks: checked.unresolvedLinks.length });
  }

  if (mode === 'check') {
    for (const program of manifest.programs) await prepare(db, program);
    return { sourceHash, eligibleSourcePrograms: manifest.programs.map(row => row.slug), existing };
  }

  const rollback = new Error('MANARATAK22_REHEARSAL_ROLLBACK');
  const checked: string[] = [];
  try {
    await db.$transaction(async tx => {
      const unitOfWork = { execute: (work: (context: { boundaryId: string; transactionClient: Prisma.TransactionClient }) => Promise<unknown>) =>
        work({ boundaryId: randomUUID(), transactionClient: tx }) };
      const atomic = new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(
        unitOfWork as ConstructorParameters<typeof AtomicAuditedOutboxMutationExecutor>[0],
        new PrismaAuditRecordRepository(db), new PrismaTransactionalOutboxStore(db),
      ));
      const ownerRepository = new PrismaScholarshipRepository(tx as PrismaClient, true);
      const admin = new AdminScholarshipUseCases(ownerRepository, atomic, new PrismaScholarshipCanonicalLookupGateway(tx as PrismaClient));
      const publicReader = new PublicScholarshipUseCases(ownerRepository);
      const context = { actorId: 'SYSTEM', actorType: 'SYSTEM', source: 'manaratak22-scholarship-import',
        correlationId: sourceHash, reason: 'Owner-authorized, source-reviewed scholarship publication without an application deadline' };
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('manaratak22-scholarships', 0))::text`;
      for (const program of manifest.programs) {
        const entry = await prepare(tx, program);
        let owner = await tx.scholarship.findUnique({ where: { slug: program.slug },
          include: { sourceEvidence: { where: { evidenceKey: 'manaratak22-program-source' } } } });
        if (owner) {
          assert.equal(owner.publicId, entry.publicId, 'SCHOLARSHIP_TEMPLATE_IDENTITY_CONFLICT');
          assert.equal(owner.sourceEvidence[0]?.sourceHash, sourceHash, 'SCHOLARSHIP_TEMPLATE_SOURCE_CHANGED');
          assert.equal(owner.status, ScholarshipStatus.PUBLISHED, 'SCHOLARSHIP_TEMPLATE_EXISTING_DRAFT_REQUIRES_REVIEW');
        } else {
          assert.equal(await tx.scholarship.count({ where: { OR: [
            { canonicalDedupKey: entry.canonicalDedupKey },
            { canonicalName: program.title },
          ] } }), 0, 'SCHOLARSHIP_TEMPLATE_DUPLICATE_REQUIRES_RECONCILIATION');
          const created = await atomic.execute({
            domain: 'SCHOLARSHIPS', aggregateType: 'SCHOLARSHIP', aggregateId: entry.publicId,
            action: 'SCHOLARSHIP_TEMPLATE_SOURCE_IMPORTED', context,
            auditMetadata: { officialSource: program.source, sourceHash, verificationBasis: entry.sourceEvidence[0].metadata.verificationBasis },
          }, () => ownerRepository.create(entry));
          await admin.markReadyToPublish(created.id, { ...context, expectedRevision: created.revision });
          const ready = await admin.getScholarship(created.id);
          await admin.publish(created.id, { ...context, expectedRevision: ready.revision });
        }
        const published = await publicReader.getScholarship(program.slug);
        assert.equal(published.displayName, program.title);
        assert.equal(published.applicationDeadline, null);
        assert.equal(published.deadlineType, 'NOT_STATED_IN_SOURCE');
        if (program.studyOptions) assert.deepEqual(published.studyOptions, program.studyOptions);
        if (program.benefits) assert.equal(new Set(published.benefits?.map(item => item.coverageTypeCode)).size, 2);
        checked.push(program.slug);
      }
      if (mode === 'rehearse') throw rollback;
    }, { maxWait: 15_000, timeout: 120_000 });
  } catch (error) {
    if (error !== rollback) throw error;
    const stillDraft = await db.scholarship.count({ where: { slug: { in: checked }, status: ScholarshipStatus.PUBLISHED } });
    assert.equal(stillDraft, 0, 'SCHOLARSHIP_REHEARSAL_ROLLBACK_NOT_VERIFIED');
    return { sourceHash, rollbackVerified: true, checked, existing };
  }
  for (const slug of checked) assert.equal((await reader.getScholarship(slug)).applicationDeadline, null);
  return { sourceHash, published: checked, existing };
}
