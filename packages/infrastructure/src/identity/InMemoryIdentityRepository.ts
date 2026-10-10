import { ADMIN_PERMISSION_CATALOG } from '@manaratak/shared';
import {
  Identity,
  IIdentityRepository,
  ListIdentitiesCriteria,
  IRoleRepository,
  IRoleAssignmentRepository,
} from '@manaratak/domain';

export class InMemoryIdentityRepository implements IIdentityRepository {
  constructor(
    private readonly roles?: IRoleRepository,
    private readonly assignments?: IRoleAssignmentRepository,
  ) {}
  private identities: Map<string, Identity> = new Map();

  public async findById(id: string): Promise<Identity | null> {
    return this.identities.get(id) || null;
  }

  public async findByEmail(email: string): Promise<Identity | null> {
    for (const identity of this.identities.values()) {
      if (identity.user && identity.user.contactRegistry.primaryEmail === email) {
        return identity;
      }
    }
    return null;
  }

  public async findByPhone(phone: string): Promise<Identity | null> {
    for (const identity of this.identities.values()) {
      if (identity.user && identity.user.contactRegistry.primaryPhone === phone) {
        return identity;
      }
    }
    return null;
  }

  public async save(identity: Identity): Promise<void> {
    this.identities.set(identity.id.toString(), identity);
  }

  public async update(identity: Identity): Promise<void> {
    this.identities.set(identity.id.toString(), identity);
  }

  public async delete(id: string): Promise<void> {
    this.identities.delete(id);
  }

  public async findAll(): Promise<Identity[]> {
    return Array.from(this.identities.values());
  }

  public async isEmailUnique(email: string): Promise<boolean> {
    const existing = await this.findByEmail(email);
    return existing === null;
  }

  public async isPhoneUnique(phone: string): Promise<boolean> {
    const existing = await this.findByPhone(phone);
    return existing === null;
  }

  public async findPaged(
    criteria: ListIdentitiesCriteria,
  ): Promise<{ items: Identity[]; total: number }> {
    let items = Array.from(this.identities.values());

    if (criteria.type) {
      items = items.filter(i => i.type === criteria.type);
    }
    if (criteria.status) {
      items = items.filter(i => i.status === criteria.status);
    }
    if (criteria.search?.trim()) {
      const query = criteria.search.trim().toLocaleLowerCase();
      items = items.filter((identity) =>
        [
          identity.id.toString(),
          identity.user?.profile.props.displayName,
          identity.user?.contactRegistry.primaryEmail,
        ].some((value) => value?.toLocaleLowerCase().includes(query)),
      );
    }
    if (criteria.verified !== undefined) {
      items = items.filter(
        (identity) =>
          !!identity.user && identity.user.contactRegistry.isEmailVerified === criteria.verified,
      );
    }

    if (criteria.roleId || criteria.adminAccess !== undefined) {
      if (!this.roles || !this.assignments) throw new Error('STAFF_ACCESS_FILTER_UNAVAILABLE');
      const matches = await Promise.all(
        items.map(async (identity) => {
          const assignments = await this.assignments!.findByIdentityId(identity.id.toString());
          if (criteria.roleId && !assignments.some((item) => item.roleId === criteria.roleId))
            return false;
          if (criteria.adminAccess !== undefined) {
            const roles = await Promise.all(
              assignments.map((item) => this.roles!.findById(item.roleId)),
            );
            const assigned = roles.some((role) =>
              role?.permissions.some(
                (p) =>
                  p.value === '*' ||
                  p.value === 'admin:*' ||
                  ADMIN_PERMISSION_CATALOG.some((entry) => entry.key === p.value),
              ),
            );
            if (assigned !== criteria.adminAccess) return false;
          }
          return true;
        }),
      );
      items = items.filter((_, index) => matches[index]);
    }
    if (criteria.accessState)
      items = items.filter((item) => item.account.accessState === criteria.accessState);
    const total = items.length;

    const limit = criteria.limit !== undefined ? criteria.limit : 20;
    const offset = criteria.offset !== undefined ? criteria.offset : 0;

    if (criteria.cursor !== undefined)
      items = items.filter((item) => !criteria.cursor || item.id.toString() > criteria.cursor)
        .sort((a, b) => (a.id.toString() < b.id.toString() ? -1 : 1));
    items = items.slice(offset, offset + limit);

    return { items, total };
  }
}
