import { PrismaClient } from '@prisma/client';
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

  private get client(): PolicyPrismaClient {
    return this.prisma as unknown as PolicyPrismaClient;
  }

  private mapToDomain(row: PolicyRecordRow): Policy {
    return new Policy({
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
      // Ignore if record not found
    }
  }
}
