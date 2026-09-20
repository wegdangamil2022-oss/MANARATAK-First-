import { Identity, IIdentityRepository, ListIdentitiesCriteria } from '@manaratak/domain';

export class InMemoryIdentityRepository implements IIdentityRepository {
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

  public async findPaged(criteria: ListIdentitiesCriteria): Promise<{ items: Identity[]; total: number }> {
    let items = Array.from(this.identities.values());

    if (criteria.type) {
      items = items.filter(i => i.type === criteria.type);
    }
    if (criteria.status) {
      items = items.filter(i => i.status === criteria.status);
    }

    const total = items.length;
    
    const limit = criteria.limit !== undefined ? criteria.limit : 20;
    const offset = criteria.offset !== undefined ? criteria.offset : 0;
    
    items = items.slice(offset, offset + limit);

    return { items, total };
  }
}
