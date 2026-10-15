import {
  HydratedStudentSavedItemDto,
  IStudentSavedItemHydrationGateway,
  IStudentWorkspaceRepository,
} from '@manaratak/domain';

export class StudentSavedItemHydrationService {
  constructor(
    private readonly repository: IStudentWorkspaceRepository,
    private readonly gateways: IStudentSavedItemHydrationGateway[],
  ) {}

  async listHydrated(studentReferenceId: string): Promise<HydratedStudentSavedItemDto[]> {
    const items = await this.repository.listSavedItems(studentReferenceId);
    return Promise.all(
      items.filter(savedItem=>savedItem.studentReferenceId===studentReferenceId).map(async (savedItem) => {
        const gateway = this.gateways.find((candidate) => candidate.supports(savedItem.entityType));
        try {
          const owner = gateway ? await gateway.hydrate(savedItem) : null;
          // A formerly-public save retains its personal snapshot; current draft labels/URLs stay private.
          return {
            savedItem,
            owner:
              owner && !owner.available
                ? { ownerType: owner.ownerType, ownerId: owner.ownerId, available: false }
                : owner,
          };
        } catch {
          // A failed owner read must not hide the student's other saved records.
          // null means unknown availability, rather than an unpublished owner.
          return { savedItem, owner: null };
        }
      }),
    );
  }
}
