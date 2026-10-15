import type {
  IMajorRepository,
  IUniversityRepository,
  IScholarshipRepository,
  IInternationalTestRepository,
} from '@manaratak/domain';
import { isPublicScholarshipOwner } from '@manaratak/domain';
import {
  crossModuleIntegrityReport,
  type IntegrityFact,
  type IntegrityOwner,
} from './CrossModuleIntegrityReport';

/** Owner repositories are read only. Authorization is passed explicitly by the API boundary. */
export class CrossModuleIntegrityUseCase {
  constructor(
    private readonly majors: IMajorRepository,
    private readonly universities: IUniversityRepository,
    private readonly scholarships: IScholarshipRepository,
    private readonly tests: IInternationalTestRepository,
  ) {}
  async execute(owner: IntegrityOwner, allowed: ReadonlySet<IntegrityOwner>, page = 1) {
    if (!allowed.has(owner) || !Number.isInteger(page) || page < 1 || page > 10000)
      throw new Error('INTEGRITY_OWNER_SCOPE_INVALID');
    const repositories = {
      MAJORS: this.majors,
      UNIVERSITIES: this.universities,
      SCHOLARSHIPS: this.scholarships,
      TESTS: this.tests,
    };
    if (owner === 'CMS') throw new Error('INTEGRITY_OWNER_NOT_SUPPORTED');
    const source = await repositories[owner].list({ page, pageSize: 20 });
    const facts: IntegrityFact[] = [];
    let referencesTruncated = false;
    for (const row of source.data) {
      const refs: IntegrityFact['references'] = [];
      const add = (target: IntegrityOwner, id?: string | null) => {
        if (id && allowed.has(target) && !refs.some((r) => r.owner === target && r.id === id))
          refs.push({ owner: target, id });
      };
      if (owner === 'UNIVERSITIES')
        for (const program of (row as Awaited<ReturnType<IUniversityRepository['findById']>>)
          ?.academicPrograms ?? []) {
          if (program.status !== 'ACTIVE') continue;
          add('MAJORS', program.majorId);
          for (const requirement of program.admissionRequirements ?? [])
            if (requirement.status === 'ACTIVE') add('TESTS', requirement.internationalTestId);
        }
      if (owner === 'SCHOLARSHIPS') {
        const scholarship = row as NonNullable<
          Awaited<ReturnType<IScholarshipRepository['findById']>>
        >;
        for (const target of scholarship.majorTargets ?? []) add('MAJORS', target.majorId);
        for (const target of scholarship.universityLinks ?? [])
          add('UNIVERSITIES', target.universityId);
        for (const item of scholarship.eligibilityItems ?? [])
          add('TESTS', item.internationalTestId);
        for (const item of scholarship.requiredDocumentItems ?? [])
          add('TESTS', item.internationalTestId);
      }
      if (refs.length > 50) referencesTruncated = true;
      facts.push({
        owner,
        id: row.id,
        status: String(
          owner === 'SCHOLARSHIPS'
            ? (row as { publicationStatus?: string }).publicationStatus
            : row.status,
        ),
        references: refs.slice(0, 50),
      });
    }
    if (
      owner === 'SCHOLARSHIPS' &&
      allowed.has('UNIVERSITIES') &&
      this.universities.findPublishedAcademicProgramsByIds
    ) {
      const links = source.data
        .flatMap(
          (row) =>
            (row as NonNullable<Awaited<ReturnType<IScholarshipRepository['findById']>>>)
              .universityLinks ?? [],
        )
        .filter((link) => link.academicProgramId);
      const ids = [...new Set(links.map((link) => link.academicProgramId!))].slice(0, 50);
      if (links.length > 50) referencesTruncated = true;
      const programs = await this.universities.findPublishedAcademicProgramsByIds(ids);
      for (const fact of facts) {
        const row = source.data.find((row) => row.id === fact.id) as NonNullable<
          Awaited<ReturnType<IScholarshipRepository['findById']>>
        >;
        for (const link of row.universityLinks ?? []) {
          if (!link.academicProgramId || !ids.includes(link.academicProgramId)) continue;
          const program = programs.find((program) => program.ownerId === link.academicProgramId);
          if (program && link.universityId) {
            const ref = fact.references.find(
              (ref) => ref.owner === 'UNIVERSITIES' && ref.id === link.universityId,
            );
            if (ref) {
              ref.expectedParentId = link.universityId;
              ref.actualParentId = program.universityOwnerId;
            }
          }
        }
      }
    }
    const refs = [
      ...new Map(facts.flatMap((f) => f.references).map((r) => [`${r.owner}:${r.id}`, r])).values(),
    ];
    const selected = refs.slice(0, 50);
    if (refs.length > selected.length) referencesTruncated = true;
    const targets = await Promise.all(
      selected.map(async (ref) => {
        if (ref.owner === 'CMS') return null;
        const target = await repositories[ref.owner].findById(ref.id);
        const published =
          !!target &&
          (ref.owner === 'SCHOLARSHIPS'
            ? isPublicScholarshipOwner(
                target as NonNullable<Awaited<ReturnType<IScholarshipRepository['findById']>>>,
              )
            : target.status === 'PUBLISHED');
        return { key: `${ref.owner}:${ref.id}`, exists: !!target, published };
      }),
    );
    const checked = new Map(
      targets.filter((t): t is NonNullable<typeof t> => !!t).map((t) => [t.key, t]),
    );
    for (const fact of facts)
      for (const ref of fact.references) {
        const target = checked.get(`${ref.owner}:${ref.id}`);
        if (target) ref.publiclyEligible = target.published;
      }
    const report = crossModuleIntegrityReport(facts, allowed, 'PERMISSIONED_OWNER_SAMPLE', false);
    const missing = facts.flatMap((f) =>
      f.references
        .filter((r) => checked.get(`${r.owner}:${r.id}`)?.exists === false)
        .map((r) => ({
          owner: f.owner,
          ownerId: f.id,
          targetOwner: r.owner,
          targetId: r.id,
          code: 'MISSING_OWNER_REFERENCE',
        })),
    );
    return {
      ...report,
      findings: [...report.findings, ...missing],
      sourceOwner: owner,
      page,
      pageSize: 20,
      total: source.total,
      hasMore: page * 20 < source.total,
      scanned: facts.length,
      targetReferencesChecked: selected.length,
      referencesTruncated,
      coverage: 'PARTIAL_OWNER_SAMPLE' as const,
    };
  }
}
