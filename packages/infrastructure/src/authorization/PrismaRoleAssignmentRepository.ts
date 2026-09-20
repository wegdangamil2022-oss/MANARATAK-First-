import { Prisma, PrismaClient } from '@prisma/client';
import { AtomicPersistenceContext, RoleAssignment, IRoleAssignmentRepository, ITransactionalRoleAssignmentRepository } from '@manaratak/domain';
import { ISpecification } from '@manaratak/core';

export interface RoleAssignmentRecordRow {
  id: string;
  identityId: string;
  roleId: string;
  assignedAt: Date;
}

export interface PrismaRoleAssignmentDelegate {
  findUnique(args: { where: { id: string } }): Promise<RoleAssignmentRecordRow | null>;
  findMany(args?: { where?: unknown }): Promise<RoleAssignmentRecordRow[]>;
  upsert(args: {
    where: { id: string };
    update: Omit<RoleAssignmentRecordRow, 'id' | 'assignedAt'>;
    create: RoleAssignmentRecordRow;
  }): Promise<RoleAssignmentRecordRow>;
  delete(args: { where: { id: string } }): Promise<unknown>;
}

export interface RoleAssignmentPrismaClient {
  roleAssignmentRecord: PrismaRoleAssignmentDelegate;
}

interface RoleAssignmentTransactionContext extends AtomicPersistenceContext { readonly transactionClient: Prisma.TransactionClient }

export class PrismaRoleAssignmentRepository implements ITransactionalRoleAssignmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  withTransaction(context: AtomicPersistenceContext): IRoleAssignmentRepository {
    const transactionClient = (context as Partial<RoleAssignmentTransactionContext>).transactionClient;
    if (!context.boundaryId || !transactionClient) throw new Error('ROLE_ASSIGNMENT_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    return new PrismaRoleAssignmentRepository(transactionClient as unknown as PrismaClient);
  }

  private get client(): RoleAssignmentPrismaClient {
    return this.prisma as unknown as RoleAssignmentPrismaClient;
  }

  private mapToDomain(row: RoleAssignmentRecordRow): RoleAssignment {
    return new RoleAssignment({
      id: row.id,
      identityId: row.identityId,
      roleId: row.roleId,
      assignedAt: row.assignedAt,
    });
  }

  async findById(id: string): Promise<RoleAssignment | null> {
    const record = await this.client.roleAssignmentRecord.findUnique({
      where: { id },
    });

    return record ? this.mapToDomain(record) : null;
  }

  async save(assignment: RoleAssignment): Promise<void> {
    await this.client.roleAssignmentRecord.upsert({
      where: { id: assignment.id },
      update: {
        identityId: assignment.identityId,
        roleId: assignment.roleId,
      },
      create: {
        id: assignment.id,
        identityId: assignment.identityId,
        roleId: assignment.roleId,
        assignedAt: assignment.assignedAt,
      },
    });
  }

  async findBy(specification: ISpecification<RoleAssignment>): Promise<RoleAssignment[]> {
    const records = await this.client.roleAssignmentRecord.findMany();
    const domainAssignments = records.map(record => this.mapToDomain(record));
    return domainAssignments.filter(assignment => specification.isSatisfiedBy(assignment));
  }

  async findByIdentityId(identityId: string): Promise<RoleAssignment[]> {
    const records = await this.client.roleAssignmentRecord.findMany({
      where: { identityId },
    });
    return records.map(record => this.mapToDomain(record));
  }

  async listAll(): Promise<RoleAssignment[]> {
    const records = await this.client.roleAssignmentRecord.findMany();
    return records.map(record => this.mapToDomain(record));
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client.roleAssignmentRecord.delete({
        where: { id },
      });
    } catch (error) {
      // Ignore if record not found
    }
  }
}
