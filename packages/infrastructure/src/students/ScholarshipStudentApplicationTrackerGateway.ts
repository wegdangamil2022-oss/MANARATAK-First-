import {
  IStudentApplicationScholarshipGateway,
  IScholarshipRepository,
  isPublicScholarshipOwner,
} from '@manaratak/domain';
export class ScholarshipStudentApplicationTrackerGateway implements IStudentApplicationScholarshipGateway {
  constructor(private readonly scholarships: IScholarshipRepository) {}
  async resolve(scholarshipId: string, cycleId?: string) {
    const s = await this.scholarships.findById(scholarshipId);
    const referenceState=await this.scholarships.readReferenceState?.(scholarshipId)??undefined;
    if (!s) return referenceState?{id:scholarshipId,displayName:'SCHOLARSHIP_HISTORY_ONLY',available:false,referenceState}:null;
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
        referenceState,
        available: false,
      };
    const versions = new Set(
      (s.versions ?? []).filter((v) => v.status === 'PUBLISHED').map((v) => v.id),
    );
    const cycles = (s.applicationCycles ?? []).filter(
      (c) =>
        c.id &&
        c.status === 'PUBLISHED' &&
        c.versionId &&
        versions.has(c.versionId) &&
        (!c.opensAt ||
          (Number.isFinite(new Date(c.opensAt).getTime()) &&
            new Date(c.opensAt).getTime() <= Date.now())) &&
        (!c.closesAt ||
          (Number.isFinite(new Date(c.closesAt).getTime()) &&
            new Date(c.closesAt).getTime() > Date.now())),
    );
    const selected = cycleId
      ? cycles.find((c) => c.id === cycleId)
      : cycles.length === 1
        ? cycles[0]
        : null;
    if (
      selected &&
      ((selected.opensAt &&
        (!Number.isFinite(new Date(selected.opensAt).getTime()) ||
          new Date(selected.opensAt).getTime() > Date.now())) ||
        (selected.closesAt &&
          (!Number.isFinite(new Date(selected.closesAt).getTime()) ||
            new Date(selected.closesAt).getTime() <= Date.now())))
    )
      return {
        id: s.id,
        slug: null,
        displayName: 'SCHOLARSHIP_CYCLE_CLOSED',
        available: false,
        cycleId: selected.id,
      };
    if (cycleId && !selected)
      return {
        id: s.id,
        slug: null,
        displayName: 'SCHOLARSHIP_CYCLE_NOT_PUBLIC',
        available: false,
        cycleId,
      };
    const deadline =
      (publiclyVisible as any).applicationDeadline ?? (publiclyVisible as any).deadline ?? null;
    return {
      id: publiclyVisible.id,
      publicId:publiclyVisible.publicId,
      ownerRevision:s.revision,
      ...(s.updatedAt&&Number.isFinite(new Date(s.updatedAt).getTime())?{ownerEffectiveAt:new Date(s.updatedAt).toISOString()}:{}),
      slug: publiclyVisible.slug,
      displayName: publiclyVisible.displayName,
      country: (publiclyVisible as any).countryName ?? null,
      deadlineAt: selected?.closesAt
        ? new Date(selected.closesAt)
        : deadline
          ? new Date(deadline)
          : null,
      cycleId: selected?.id ?? null,
      cycleKey: selected?.cycleKey ?? null,
      ownerVersionId: selected?.versionId ?? null,
      requirements: (publiclyVisible.requiredDocumentItems ?? [])
        .filter((d) => d.id)
        .map((d) => ({ id: d.id!, displayName: d.displayName, required: d.isRequired === true })),
      cycles: cycles.map((c) => ({
        id: c.id!,
        cycleKey: c.cycleKey,
        closesAt: c.closesAt ? new Date(c.closesAt) : null,
      })),
      lifecycleStatus: String(s.publicationStatus ?? s.status),
      available: true,
    };
  }
}
