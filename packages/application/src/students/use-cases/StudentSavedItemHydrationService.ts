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
    return Promise.all(items.map(async (savedItem) => {
      const gateway = this.gateways.find((candidate) => candidate.supports(savedItem.entityType));
      return { savedItem, owner: gateway ? await gateway.hydrate(savedItem) : null };
    }));
  }
}
