import { IStudentApplicationScholarshipGateway, IScholarshipRepository,
  isPublicScholarshipOwner,
} from '@manaratak/domain';
export class ScholarshipStudentApplicationTrackerGateway implements IStudentApplicationScholarshipGateway {
  constructor(private readonly scholarships: IScholarshipRepository) {}
  async resolve(scholarshipId:string){
    const s=await this.scholarships.findById(scholarshipId); if(!s) return null;
    const publiclyVisible = isPublicScholarshipOwner(s)
      ? await this.scholarships.findPublishedBySlug(s.slug)
      : null;
    if (!publiclyVisible || publiclyVisible.id !== s.id)
      return {
        id: s.id,
        slug: null,
        displayName: 'SCHOLARSHIP_NOT_PUBLIC',
        deadlineAt: null,
        lifecycleStatus: String(s.publicationStatus ?? s.status),
        available: false,
      };
    const deadline=(publiclyVisible as any).applicationDeadline ?? (publiclyVisible as any).deadline ?? null;
    return { id:publiclyVisible.id, slug:publiclyVisible.slug, displayName:publiclyVisible.displayName, country:(publiclyVisible as any).countryName ?? null, deadlineAt:deadline?new Date(deadline):null, lifecycleStatus:String(s.publicationStatus ?? s.status), available: true,
    };
  }
}
