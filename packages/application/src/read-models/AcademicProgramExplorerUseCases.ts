import type { IScholarshipRepository } from '@absheer/domain';
import type {
  UniversityProgramWorkspaceUseCases,
  ProgramQuery,
} from '../universities/use-cases/UniversityProgramWorkspaceUseCases';
export class AcademicProgramExplorerUseCases {
  constructor(
    private readonly programs: UniversityProgramWorkspaceUseCases,
    private readonly scholarships: IScholarshipRepository,
  ) {}
  facet(
    input: ProgramQuery,
    kind: 'DEGREE' | 'MAJOR' | 'TEST' | 'LANGUAGE',
    after?: string,
    search?: string,
    publicOnly = true,
  ) {
    return this.programs.facet(input, kind, after, search, publicOnly);
  }
  async query(input: ProgramQuery, publicOnly = true) {
    const page = await this.programs.query(input, publicOnly);
    let batch:
      | Awaited<
          ReturnType<NonNullable<IScholarshipRepository['listPublishedProgramRelationshipsPage']>>
        >
      | undefined;
    let batchUnavailable = false;
    if (this.scholarships.listPublishedProgramRelationshipsPage)
      try {
        batch = await this.scholarships.listPublishedProgramRelationshipsPage(
          page.items.map((program: any) => program.id),
          6,
        );
      } catch {
        batchUnavailable = true;
      }
    const items = await Promise.all(
      page.items.map(async (program: any) => {
        try {
          if (batchUnavailable) throw new Error('SCHOLARSHIP_OWNER_UNAVAILABLE');
          const related = batch
            ? batch[program.id]
            : await this.scholarships.listPublished({ academicProgramId: program.id, limit: 6 });
          return {
            ...program,
            scholarshipCount: related.total,
            scholarships: {
              state: 'AVAILABLE',
              data: related.data.map((s) => ({
                ownerId: s.id,
                publicId: s.publicId,
                slug: s.slug,
                displayName:
                  typeof (s as { localizedNames?: Record<string, string> }).localizedNames?.[
                    input.locale ?? 'ar'
                  ] === 'string'
                    ? (s as { localizedNames: Record<string, string> }).localizedNames[
                        input.locale ?? 'ar'
                      ]
                    : s.displayName,
              })),
              total: related.total,
              hasMore: related.hasMore ?? false,
              nextCursor: related.nextCursor ?? null,
            },
          };
        } catch {
          return {
            ...program,
            scholarshipCount: null,
            scholarships: {
              state: 'UNAVAILABLE',
              data: [],
              total: null,
              hasMore: false,
              nextCursor: null,
            },
          };
        }
      }),
    );
    return {
      ...page,
      items,
      scope: {
        countryReferenceId: input.countryReferenceId,
        locale: input.locale ?? 'ar',
        visibility: publicOnly ? 'PUBLIC' : 'ADMIN_ALL',
        degreeLevelId: input.degreeLevelId,
        majorId: input.majorId,
        internationalTestId: input.internationalTestId,
        languageReferenceId: input.languageReferenceId,
        academicProgramId: input.academicProgramId,
      },
      visibility: publicOnly ? 'PUBLIC' : 'ADMIN_ALL',
      consistency: 'LIVE_OWNER_READS',
    };
  }
  async scholarshipPage(input: ProgramQuery, programId: string, after?: string, publicOnly = true) {
    const page = await this.programs.query(
      { ...input, academicProgramId: programId, limit: 1, cursor: undefined },
      publicOnly,
    );
    if (!page.items.some((program: any) => program.id === programId))
      throw new Error('EXPLORER_PROGRAM_NOT_IN_SCOPE');
    const scholarships = await this.scholarships.listPublished({
      academicProgramId: programId,
      cursor: after,
      limit: 6,
    });
    return {
      state: 'AVAILABLE',
      data: scholarships.data.map((s) => ({
        ownerId: s.id,
        publicId: s.publicId,
        slug: s.slug,
        displayName:
          typeof (s as { localizedNames?: Record<string, string> }).localizedNames?.[
            input.locale ?? 'ar'
          ] === 'string'
            ? (s as { localizedNames: Record<string, string> }).localizedNames[input.locale ?? 'ar']
            : s.displayName,
      })),
      total: scholarships.total,
      hasMore: scholarships.hasMore ?? false,
      nextCursor: scholarships.nextCursor ?? null,
    };
  }
}
