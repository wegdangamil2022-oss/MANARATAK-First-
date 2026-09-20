import { createHash, randomUUID } from 'node:crypto';
import { Identity, IIdentityRepository, ListIdentitiesCriteria } from '@manaratak/domain';
import { IdentityMapper } from './IdentityMapper';

export class PrismaIdentityRepository implements IIdentityRepository {
  constructor(private readonly prisma: any) {}

  private get delegate() { return this.delegateFor(this.prisma); }

  private delegateFor(client: any) {
    if (client && client.identityRecord) return client.identityRecord;
    return client?.identityRecord || client;
  }

  public async findById(id: string): Promise<Identity | null> {
    const record = await this.delegate.findUnique({
      where: { id },
      include: { user: true, account: true }
    });
    if (!record) return null;
    return IdentityMapper.toDomain(record);
  }

  public async findByEmail(email: string): Promise<Identity | null> {
    const record = await this.delegate.findFirst({
      where: { user: { primaryEmail: { equals: email, mode: 'insensitive' } } },
      include: { user: true, account: true }
    });
    if (!record) return null;
    return IdentityMapper.toDomain(record);
  }

  public async findByPhone(phone: string): Promise<Identity | null> {
    const record = await this.delegate.findFirst({
      where: { user: { primaryPhone: phone } },
      include: { user: true, account: true }
    });
    if (!record) return null;
    return IdentityMapper.toDomain(record);
  }

  public async save(identity: Identity): Promise<void> {
    const data = IdentityMapper.toPersistence(identity);
    const id = data.id;
    const events = [...identity.domainEvents];

    const persist = async (client: any) => {
      const delegate = this.delegateFor(client);
      const existing = await delegate.findUnique({ where: { id } });
      if (existing) {
        const { user, account, ...identityData } = data;
        await delegate.update({
          where: { id },
          data: {
            ...identityData,
            ...(user ? { user: { upsert: user } } : {}),
            ...(account ? { account: { upsert: account } } : {})
          }
        });
      } else {
        const { user, account, ...identityData } = data;
        await delegate.create({
          data: {
            ...identityData,
            ...(user ? { user: { create: user.create } } : {}),
            ...(account ? { account: { create: account.create } } : {})
          }
        });
      }
      if (events.length > 0) {
        const outbox = client?.transactionalOutboxRecord;
        if (!outbox?.upsert) throw new Error('IDENTITY_DURABLE_OUTBOX_REQUIRED');
        for (const event of events) {
          const mapped = this.mapDomainEvent(event as any, data.type);
          const eventId = this.stableEventId(id, event as any, mapped);
          await outbox.upsert({ where: { id: eventId }, update: {}, create: {
            id: eventId,
            eventType: mapped.eventType,
            domain: 'IDENTITY',
            aggregateType: 'Identity',
            aggregateId: id,
            payload: mapped.payload,
            metadata: { schemaVersion: 1, ownerDomain: 'IDENTITY', source: 'PrismaIdentityRepository' },
            correlationId: randomUUID(),
            state: 'PENDING',
            attempts: 0,
            availableAt: new Date(),
            createdAt: event.dateTimeOccurred ?? new Date(),
          } });
        }
      }
    };

    if (events.length > 0) {
      if (!this.prisma?.$transaction) throw new Error('IDENTITY_DURABLE_TRANSACTION_REQUIRED');
      await this.prisma.$transaction(async (tx: any) => persist(tx));
      identity.clearEvents();
      return;
    }
    await persist(this.prisma);
  }

  private mapDomainEvent(event: any, identityType: unknown): { eventType: string; payload: Record<string, unknown> } {
    const name = event?.constructor?.name;
    if (name === 'IdentityCreatedEvent') return { eventType: 'IdentityCreated.v1', payload: { identityId: event.identityId, identityType: event.identityType ?? identityType } };
    if (name === 'IdentityActivatedEvent') return { eventType: 'IdentityActivated.v1', payload: { identityId: event.identityId, identityType } };
    if (name === 'IdentityStatusChangedEvent') return { eventType: 'IdentityStatusChanged.v1', payload: { identityId: event.identityId, identityType, oldStatus: event.oldStatus, newStatus: event.newStatus } };
    if (name === 'IdentityContactUpdatedEvent') return { eventType: 'IdentityContactUpdated.v1', payload: { identityId: event.identityId, identityType, contactType: event.contactType } };
    throw new Error(`IDENTITY_DOMAIN_EVENT_NOT_MAPPED:${String(name || 'UNKNOWN')}`);
  }

  private stableEventId(identityId: string, event: any, mapped: { eventType: string; payload: Record<string, unknown> }): string {
    const occurredAt = event?.dateTimeOccurred instanceof Date ? event.dateTimeOccurred.toISOString() : String(event?.dateTimeOccurred ?? '');
    const digest = createHash('sha256')
      .update(JSON.stringify({ identityId, eventType: mapped.eventType, occurredAt, payload: mapped.payload }))
      .digest('hex');
    return `identity-event:${digest}`;
  }

  public async update(identity: Identity): Promise<void> {
    await this.save(identity);
  }

  public async delete(id: string): Promise<void> {
    await this.delegate.delete({ where: { id } });
  }

  public async findAll(): Promise<Identity[]> {
    const records = await this.delegate.findMany({
      include: { user: true, account: true }
    });
    return records.map((r: any) => IdentityMapper.toDomain(r));
  }

  public async isEmailUnique(email: string): Promise<boolean> {
    const existing = await this.delegate.findFirst({
      where: { user: { primaryEmail: email } },
      select: { id: true }
    });
    return !existing;
  }

  public async isPhoneUnique(phone: string): Promise<boolean> {
    const existing = await this.delegate.findFirst({
      where: { user: { primaryPhone: phone } },
      select: { id: true }
    });
    return !existing;
  }

  public async findPaged(criteria: ListIdentitiesCriteria): Promise<{ items: Identity[]; total: number }> {
    const where: any = {};
    if (criteria.type) {
      where.type = criteria.type;
    }
    if (criteria.status) {
      where.status = criteria.status;
    }

    const [total, records] = await Promise.all([
      this.delegate.count({ where }),
      this.delegate.findMany({
        where,
        take: criteria.limit !== undefined ? criteria.limit : 20,
        skip: criteria.offset !== undefined ? criteria.offset : 0,
        include: { user: true, account: true },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      items: records.map((r: any) => IdentityMapper.toDomain(r)),
      total
    };
  }
}
