import { Prisma, PrismaClient } from '@prisma/client';
import { AtomicPersistenceContext, Role, PermissionReference, IRoleRepository, ITransactionalRoleRepository } from '@manaratak/domain';
import { ISpecification } from '@manaratak/core';

export interface RoleRecordRow {
  id: string;
  name: string;
  description: string;
  permissions: unknown;
  policyIds: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrismaRoleDelegate {
  findUnique(args: { where: { id: string } }): Promise<RoleRecordRow | null>;
  findMany(args?: { where?: unknown }): Promise<RoleRecordRow[]>;
  upsert(args: {
    where: { id: string };
    update: Omit<RoleRecordRow, 'id' | 'createdAt' | 'updatedAt'>;
    create: Omit<RoleRecordRow, 'createdAt' | 'updatedAt'>;
  }): Promise<RoleRecordRow>;
  delete(args: { where: { id: string } }): Promise<unknown>;
}

export interface RolePrismaClient {
  roleRecord: PrismaRoleDelegate;
}

interface RoleTransactionContext extends AtomicPersistenceContext { readonly transactionClient: Prisma.TransactionClient }

export class PrismaRoleRepository implements ITransactionalRoleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  withTransaction(context: AtomicPersistenceContext): IRoleRepository {
    const transactionClient = (context as Partial<RoleTransactionContext>).transactionClient;
    if (!context.boundaryId || !transactionClient) throw new Error('ROLE_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    return new PrismaRoleRepository(transactionClient as unknown as PrismaClient);
  }

  private get client(): RolePrismaClient {
    return this.prisma as unknown as RolePrismaClient;
  }

  private mapToDomain(row: RoleRecordRow): Role {
    const rawPermissions = Array.isArray(row.permissions) ? (row.permissions as string[]) : [];
    const rawPolicyIds = Array.isArray(row.policyIds) ? (row.policyIds as string[]) : [];

    return new Role({
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: rawPermissions.map(p => new PermissionReference(p)),
      policyIds: rawPolicyIds,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      revision: row.updatedAt.toISOString(),
    });
  }

  async findById(id: string): Promise<Role | null> {
    const record = await this.client.roleRecord.findUnique({
      where: { id },
    });

    return record ? this.mapToDomain(record) : null;
  }

  async save(role: Role): Promise<void> {
    await this.client.roleRecord.upsert({
      where: { id: role.id },
      update: {
        name: role.name,
        description: role.description,
        permissions: role.permissions.map(p => p.value),
        policyIds: role.policyIds,
      },
      create: {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions.map(p => p.value),
        policyIds: role.policyIds,
      },
    });
  }

  async findBy(specification: ISpecification<Role>): Promise<Role[]> {
    const records = await this.client.roleRecord.findMany();
    const domainRoles = records.map(record => this.mapToDomain(record));
    return domainRoles.filter(role => specification.isSatisfiedBy(role));
  }

  async queryPage(input: { limit: number; cursor?: string; policyId?: string; search?: string }) {
    const rows = await this.prisma.roleRecord.findMany({
      where: {
        ...(input.cursor ? { id: { gt: input.cursor } } : {}),
        ...(input.policyId ? {policyIds:{array_contains:[input.policyId]}} : {}),
        ...(input.search
          ? {
              OR: [
                { name: { contains: input.search, mode: 'insensitive' } },
                { description: { contains: input.search, mode: 'insensitive' } },
                { id: { contains: input.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { id: 'asc' },
      take: input.limit + 1,
    });
    const items = rows.slice(0, input.limit).map((row) => this.mapToDomain(row));
    return { items, nextCursor: rows.length > input.limit ? items.at(-1)!.id : null };
  }

  async listAll(): Promise<Role[]> {
    const records = await this.client.roleRecord.findMany();
    return records.map(record => this.mapToDomain(record));
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client.roleRecord.delete({
        where: { id },
      });
    } catch (error) {
      if ((error as { code?: string })?.code !== 'P2025') throw error;
    }
  }

  /** Serializes normalized-name claims within the owning transaction. No schema changes. */
  private async assertUniqueName(role: Role): Promise<void> {
    const normalized = role.name.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
    for(const policyId of [...new Set(role.policyIds)].sort()) {
      const key = `authorization-policy-reference:${policyId}`;
      await this.prisma.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text AS lock_result`);
    }
    await this.prisma.$queryRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`authorization-role-name:${normalized}`}))::text AS lock_result`,
    );
    const collisions = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM "RoleRecord"
      WHERE id <> ${role.id}
        AND lower(trim(regexp_replace(normalize(name, NFKC), '[[:space:]]+', ' ', 'g'))) = ${normalized}
      LIMIT 1`);
    if (collisions.length) throw new Error('ROLE_NAME_ALREADY_EXISTS');
  }

  async createUnique(role: Role): Promise<void> {
    const operation = async (client: PrismaRoleRepository) => {
      await client.assertUniqueName(role);
      await client.prisma.roleRecord.create({
        data: {
          id: role.id,
          name: role.name,
          description: role.description,
          permissions: role.permissions.map((permission) => permission.value),
          policyIds: role.policyIds,
        },
      });
    };
    // withTransaction is used by the atomic audit coordinator. Do not nest transactions.
    if (typeof this.prisma.$transaction !== 'function') return operation(this);
    await this.prisma.$transaction((tx) =>
      operation(new PrismaRoleRepository(tx as unknown as PrismaClient)),
    );
  }

  async updateIfCurrent(role: Role, expectedRevision: string): Promise<void> {
    const revision = new Date(expectedRevision);
    if (!Number.isFinite(revision.getTime())) throw new Error('ROLE_REVISION_INVALID');
    const operation = async (client: PrismaRoleRepository) => {
      await client.assertUniqueName(role);
      const nextRevision = new Date(Math.max(Date.now(), revision.getTime() + 1));
      const result = await client.prisma.roleRecord.updateMany({
        where: { id: role.id, updatedAt: revision },
        data: {
          name: role.name,
          description: role.description,
          permissions: role.permissions.map((permission) => permission.value),
          policyIds: role.policyIds,
          updatedAt: nextRevision,
        },
      });
      if (result.count !== 1) throw new Error('ROLE_REVISION_CONFLICT');
    };
    if (typeof this.prisma.$transaction !== 'function') return operation(this);
    await this.prisma.$transaction((tx) =>
      operation(new PrismaRoleRepository(tx as unknown as PrismaClient)),
    );
  }

  async countMembers(id: string): Promise<number> {
    return this.prisma.roleAssignmentRecord.count({ where: { roleId: id } });
  }

  async deleteIfUnused(id: string, expectedRevision: string): Promise<void> {
    const revision = new Date(expectedRevision);
    if (!Number.isFinite(revision.getTime())) throw new Error('ROLE_REVISION_INVALID');
    const operation = async (client: PrismaRoleRepository) => {
      await client.prisma.$queryRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`authorization-role-reference:${id}`}, 0))::text AS lock_result`,
      );
      // FK Restrict also prevents a concurrent assignment from being orphaned.
      if (await client.countMembers(id)) throw new Error('ROLE_HAS_ASSIGNMENTS');
      if (await client.prisma.adminEmergencyAccessRecord.count({ where: { roleId: id } }))
        throw new Error('ROLE_HAS_EMERGENCY_HISTORY');
      const result = await client.prisma.roleRecord.deleteMany({
        where: { id, updatedAt: revision },
      });
      if (result.count !== 1) throw new Error('ROLE_REVISION_CONFLICT');
    };
    if (typeof this.prisma.$transaction !== 'function') return operation(this);
    await this.prisma.$transaction((tx) =>
      operation(new PrismaRoleRepository(tx as unknown as PrismaClient)),
    );
  }
}
