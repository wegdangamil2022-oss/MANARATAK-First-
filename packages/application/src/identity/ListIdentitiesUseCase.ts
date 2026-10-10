import { ADMIN_PERMISSION_CATALOG } from '@manaratak/shared';
import { UseCase, Result, ResultFactory } from '@manaratak/core';
import {
  IIdentityRepository,
  IRoleRepository,
  IRoleAssignmentRepository,
  IAuditRecordRepository,
  IdentityType,
  LifeStatus,
} from '@manaratak/domain';
import { IdentityDto } from './dtos';
import { IdentityDtoMapper } from './mapper';

export interface ListIdentitiesInput {
  type?: IdentityType;
  status?: LifeStatus;
  limit?: number;
  offset?: number;
  cursor?: string;
  accessState?: string;
  roleId?: string;
  adminAccess?: boolean;
  includeAccess?: boolean;
  search?: string;
  verified?: boolean;
}

export interface ListIdentitiesOutput {
  nextCursor?: string | null;
  items: (IdentityDto & {
    assignedRoles?: { id: string; name: string }[];
    adminAccessAssigned?: boolean;
    latestAccessChange?: { action: string; timestamp: string } | null;
  })[];
  total: number;
}

export class ListIdentitiesUseCase implements UseCase<ListIdentitiesInput, Result<ListIdentitiesOutput>> {
  constructor(
    private readonly identityRepository: IIdentityRepository,
    private readonly roles?: IRoleRepository,
    private readonly assignments?: IRoleAssignmentRepository,
    private readonly audit?: IAuditRecordRepository,
  ) {}

  public async roleOptions(input: { limit: number; cursor?: string; search?: string }) {
    if (!this.roles?.queryPage) throw new Error('STAFF_ROLE_OPTIONS_UNAVAILABLE');
    const page = await this.roles.queryPage(input);
    return {
      roles: page.items.map((role) => ({ id: role.id, name: role.name })),
      nextCursor: page.nextCursor,
    };
  }
  public async execute(input: ListIdentitiesInput): Promise<Result<ListIdentitiesOutput>> {
    try {
      const criteria = {
        cursor: input.cursor,
        accessState: input.accessState,
        roleId: input.roleId,
        adminAccess: input.adminAccess,
        type: input.type,
        status: input.status,
        search: input.search,
        verified: input.verified,
        limit: input.limit !== undefined ? Number(input.limit) : 20,
        offset: input.offset !== undefined ? Number(input.offset) : 0,
      };

      const result = await this.identityRepository.findPaged(criteria);

      const items = await Promise.all(
        result.items.map(async (identity) => {
          const dto = IdentityDtoMapper.toDto(identity);
          if (!input.includeAccess) return dto;
          if (!this.roles || !this.assignments)
            throw new Error('STAFF_ACCESS_PROJECTION_UNAVAILABLE');
          const assigned = await this.assignments.findByIdentityId(dto.id);
          const roles = (
            await Promise.all(
              [...new Set(assigned.map((item) => item.roleId))].map((id) =>
                this.roles!.findById(id),
              ),
            )
          ).filter((role) => role !== null);
          const events = this.audit
            ? await this.audit.queryPage({
                category: 'AUTHORIZATION_MUTATION',
                subjectIdentityId: dto.id,
                subjectRoleIds: [
                  ...roles.map((role) => role.id),
                  ...roles.flatMap((role) => role.policyIds),
                ],
                limit: 1,
              })
            : null;
          const latest = events?.items[0];
          return {
            ...dto,
            assignedRoles: roles.map((role) => ({ id: role.id, name: role.name })),
            adminAccessAssigned: roles.some((role) =>
              role.permissions.some(
                (p) =>
                  p.value === '*' ||
                  p.value === 'admin:*' ||
                  ADMIN_PERMISSION_CATALOG.some((entry) => entry.key === p.value),
              ),
            ),
            latestAccessChange: latest
              ? {
                  action: latest.getAction().getValue(),
                  timestamp: latest.getTimestamp().getValue().toISOString(),
                }
              : null,
          };
        }),
      );
      return ResultFactory.success({
        nextCursor:
          input.cursor !== undefined && result.items.length === criteria.limit
            ? result.items.at(-1)!.id.toString()
            : null,
        items,
        total: result.total,
      });
    } catch (error: unknown) {
      return ResultFactory.failure(
        error instanceof Error ? error.message : 'IDENTITY_LIST_UNAVAILABLE',
      );
    }
  }
}
