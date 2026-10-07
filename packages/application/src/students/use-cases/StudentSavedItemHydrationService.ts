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
      items.map(async (savedItem) => {
        const gateway = this.gateways.find((candidate) => candidate.supports(savedItem.entityType));
        try {
          return { savedItem, owner: gateway ? await gateway.hydrate(savedItem) : null };
        } catch {
          // A failed owner read must not hide the student's other saved records.
          // null means unknown availability, rather than an unpublished owner.
          return { savedItem, owner: null };
        }
      }),
    );
  }
}
