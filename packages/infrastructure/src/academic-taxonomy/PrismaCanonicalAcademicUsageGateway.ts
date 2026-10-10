import { Prisma, PrismaClient } from '@prisma/client';
import { AtomicPersistenceContext, CanonicalAcademicReferenceKind, CanonicalAcademicUsageSummary, ICanonicalAcademicUsageGateway } from '@manaratak/domain';

const taxonomyRelations = ['majorAcademicFieldLinks', 'majorDisciplineLinks', 'majorProfileAcademicFieldLinks', 'majorProfileDisciplineLinks',
  'majorClassificationMappings', 'internationalTestRelationships', 'courseTaxonomyResolutions', 'courseTaxonomyLinks', 'courseMajorProjections',
  'parentEdges', 'childEdges', 'sourceMappings', 'targetMappings'] as const;
const degreeRelations = ['majorProfiles', 'internationalTestDegreeRelationships', 'universityPrograms', 'scholarshipTargets', 'scholarshipEligibility'] as const;

/** Bounded aggregate query only; never hydrates consumer records or invokes their repositories. */
export class PrismaCanonicalAcademicUsageGateway implements ICanonicalAcademicUsageGateway {
  constructor(private readonly prisma: PrismaClient) {}
  withTransaction(context: AtomicPersistenceContext): ICanonicalAcademicUsageGateway {
    const tx = (context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }).transactionClient;
    if (!context.boundaryId || !tx) throw new Error('ACADEMIC_USAGE_TRANSACTION_REQUIRED');
    return new PrismaCanonicalAcademicUsageGateway(tx as unknown as PrismaClient);
  }
  async summarize(kind: CanonicalAcademicReferenceKind, id: string): Promise<CanonicalAcademicUsageSummary> {
    const relations = kind === 'TAXONOMY_NODE' ? taxonomyRelations : degreeRelations;
    const select = Object.fromEntries(relations.map(name => [name, true]));
    const row = kind === 'TAXONOMY_NODE'
      ? await this.prisma.academicTaxonomyNode.findUnique({ where: { id }, select: { _count: { select } } })
      : await this.prisma.degreeLevel.findUnique({ where: { id }, select: { canonicalCode: true, _count: { select } } });
    if (!row) throw new Error('ACADEMIC_USAGE_REFERENCE_NOT_FOUND');
    const counts = { ...(row as unknown as { _count: Record<string, number> })._count };
    if (kind === 'DEGREE_LEVEL') {
      // Include historic code-only test references without counting ID-backed links twice.
      counts.legacyMajorProfileCodes = await this.prisma.majorLevelProfile.count({
        where: { degreeLevelId: null, level: (row as unknown as { canonicalCode: string }).canonicalCode },
      });
      counts.legacyTestDegreeCodes = await this.prisma.internationalTestDegreeRelationship.count({
        where: { degreeLevelId: null, degreeLevelCode: (row as unknown as { canonicalCode: string }).canonicalCode },
      });
    }
    return { kind, id, counts, totalReferences: Object.values(counts).reduce((sum, value) => sum + value, 0), observedAt: new Date().toISOString() };
  }
}
