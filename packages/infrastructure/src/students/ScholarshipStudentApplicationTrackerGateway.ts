import { IStudentApplicationScholarshipGateway, IScholarshipRepository, ScholarshipPublicationStatus } from '@manaratak/domain';
export class ScholarshipStudentApplicationTrackerGateway implements IStudentApplicationScholarshipGateway {
  constructor(private readonly scholarships: IScholarshipRepository) {}
  async resolve(scholarshipId:string){
    const s=await this.scholarships.findById(scholarshipId); if(!s) return null;
    const deadline=(s as any).applicationDeadline ?? (s as any).deadline ?? null;
    return { id:s.id, slug:s.slug, displayName:s.displayName, country:(s as any).countryName ?? null, deadlineAt:deadline?new Date(deadline):null, lifecycleStatus:String(s.publicationStatus ?? s.status), available:s.publicationStatus===ScholarshipPublicationStatus.PUBLISHED };
  }
}
