import { Prisma, PrismaClient } from '@prisma/client';
import { Policy, IPolicyRepository } from '@manaratak/domain';
import { ISpecification } from '@manaratak/core';

export interface PolicyRecordRow {
  id: string;
  name: string;
  description: string;
  ruleType: string;
  ruleConfiguration: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrismaPolicyDelegate {
  findUnique(args: { where: { id: string } }): Promise<PolicyRecordRow | null>;
  findMany(args?: { where?: unknown }): Promise<PolicyRecordRow[]>;
  upsert(args: {
    where: { id: string };
    update: Omit<PolicyRecordRow, 'id' | 'createdAt' | 'updatedAt'>;
    create: Omit<PolicyRecordRow, 'createdAt' | 'updatedAt'>;
  }): Promise<PolicyRecordRow>;
  delete(args: { where: { id: string } }): Promise<unknown>;
}

export interface PolicyPrismaClient {
  policyRecord: PrismaPolicyDelegate;
}

export class PrismaPolicyRepository implements IPolicyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  withTransaction(
    context: import('@manaratak/domain').AtomicPersistenceContext,
  ): IPolicyRepository {
    const client = (context as unknown as { transactionClient?: Prisma.TransactionClient })
      .transactionClient;
    if (!context.boundaryId || !client)
      throw new Error('POLICY_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    return new PrismaPolicyRepository(client as unknown as PrismaClient);
  }

  async queryPage(input: { limit: number; cursor?: string }) {
    const rows = await this.prisma.policyRecord.findMany({
      where: input.cursor ? { id: { gt: input.cursor } } : {},
      orderBy: { id: 'asc' },
      take: input.limit + 1,
    });
    const items = rows.slice(0, input.limit).map((row) => this.mapToDomain(row));
    return { items, nextCursor: rows.length > input.limit ? items.at(-1)!.id : null };
  }

  async create(policy: Policy): Promise<void> {
    await this.prisma.policyRecord.create({
      data: {
        id: policy.id,
        name: policy.name,
        description: policy.description,
        ruleType: policy.ruleType,
        ruleConfiguration: policy.ruleConfiguration,
      },
    });
  }

  async assertRoleUsageAuthority(id: string, permittedPermissions: string[]): Promise<void> {
    if(typeof this.prisma.$transaction === 'function')throw new Error('POLICY_TRANSACTIONAL_PERSISTENCE_REQUIRED');
    // Joins the owner mutation transaction; role attachment uses the same lock.
    const key = `authorization-policy-reference:${id}`;
    await this.prisma.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text AS lock_result`);
    let cursor: string | undefined;
    for (;;) {
      const roles = await this.prisma.roleRecord.findMany({where:{policyIds:{array_contains:[id]},...(cursor ? {id:{gt:cursor}} : {})},orderBy:{id:'asc'},select:{id:true,permissions:true},take:100});
      if(roles.some(role => ['student','administrator'].includes(role.id) || /^(?:system|canonical|baseline)[:_-]/i.test(role.id)
        || !Array.isArray(role.permissions) || role.permissions.some(permission => typeof permission !== 'string' || !permittedPermissions.includes(permission))))throw new Error('POLICY_PERMISSION_EXCEEDS_ACTOR');
      if(roles.length < 100)break;
      cursor = roles.at(-1)!.id;
    }
  }

  async updateIfCurrent(policy: Policy, expectedRevision: string): Promise<void> {
    const revision = new Date(expectedRevision);
    if (!Number.isFinite(revision.getTime())) throw new Error('POLICY_REVISION_INVALID');
    const result = await this.prisma.policyRecord.updateMany({
      where: { id: policy.id, updatedAt: revision },
      data: {
        name: policy.name,
        description: policy.description,
        ruleType: policy.ruleType,
        ruleConfiguration: policy.ruleConfiguration,
        updatedAt: new Date(Math.max(Date.now(), revision.getTime() + 1)),
      },
    });
    if (result.count !== 1) throw new Error('POLICY_REVISION_CONFLICT');
  }

  private get client(): PolicyPrismaClient {
    return this.prisma as unknown as PolicyPrismaClient;
  }

  private mapToDomain(row: PolicyRecordRow): Policy {
    return new Policy({
      revision: row.updatedAt.toISOString(),
      id: row.id,
      name: row.name,
      description: row.description,
      ruleType: row.ruleType,
      ruleConfiguration: row.ruleConfiguration,
    });
  }

  async findById(id: string): Promise<Policy | null> {
    const record = await this.client.policyRecord.findUnique({
      where: { id },
    });

    return record ? this.mapToDomain(record) : null;
  }

  async save(policy: Policy): Promise<void> {
    await this.client.policyRecord.upsert({
      where: { id: policy.id },
      update: {
        name: policy.name,
        description: policy.description,
        ruleType: policy.ruleType,
        ruleConfiguration: policy.ruleConfiguration,
      },
      create: {
        id: policy.id,
        name: policy.name,
        description: policy.description,
        ruleType: policy.ruleType,
        ruleConfiguration: policy.ruleConfiguration,
      },
    });
  }

  async findBy(specification: ISpecification<Policy>): Promise<Policy[]> {
    const records = await this.client.policyRecord.findMany();
    const domainPolicies = records.map(record => this.mapToDomain(record));
    return domainPolicies.filter(policy => specification.isSatisfiedBy(policy));
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client.policyRecord.delete({
        where: { id },
      });
    } catch (error) {
      if ((error as { code?: string })?.code !== 'P2025') throw error;
    }
  }
}
