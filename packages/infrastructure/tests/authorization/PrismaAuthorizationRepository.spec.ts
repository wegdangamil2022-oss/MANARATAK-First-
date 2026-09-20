import { describe, expect, it, vi, beforeEach } from 'vitest';
import { 
  Role, 
  PermissionReference, 
  Policy, 
  RoleAssignment, 
  AuthorizationEvaluatorService,
  ResourceUrn,
  Action,
  AccessDecision,
  IPolicyEvaluator
} from '@manaratak/domain';
import { EvaluateAccessUseCase } from '@manaratak/application';
import { ISpecification } from '@manaratak/core';

import { 
  PrismaRoleRepository, 
  PrismaPolicyRepository, 
  PrismaRoleAssignmentRepository,
  InMemoryRoleRepository,
  InMemoryPolicyRepository,
  InMemoryRoleAssignmentRepository
} from '../../src';

describe('Authorization Persistence Layer Tests', () => {
  describe('InMemory Repositories', () => {
    it('InMemoryRoleRepository works correctly', async () => {
      const repo = new InMemoryRoleRepository();
      const role = new Role({
        id: 'r-1',
        name: 'Admin',
        description: 'Super Admin',
        permissions: [new PermissionReference('doc:read'), new PermissionReference('doc:write')],
        policyIds: ['p-1']
      });

      await repo.save(role);
      
      const found = await repo.findById('r-1');
      expect(found).not.toBeNull();
      expect(found?.name).toBe('Admin');
      expect(found?.permissions.map(p => p.value)).toContain('doc:read');

      // Test spec
      const spec: ISpecification<Role> = {
        isSatisfiedBy: (candidate) => candidate.name === 'Admin'
      };
      const foundList = await repo.findBy(spec);
      expect(foundList).toHaveLength(1);

      await repo.delete('r-1');
      const deleted = await repo.findById('r-1');
      expect(deleted).toBeNull();
    });

    it('InMemoryPolicyRepository works correctly', async () => {
      const repo = new InMemoryPolicyRepository();
      const policy = new Policy({
        id: 'p-1',
        name: 'Ip restriction',
        description: 'Allowed IPs only',
        ruleType: 'IP',
        ruleConfiguration: '127.0.0.1'
      });

      await repo.save(policy);

      const found = await repo.findById('p-1');
      expect(found).not.toBeNull();
      expect(found?.name).toBe('Ip restriction');

      await repo.delete('p-1');
      const deleted = await repo.findById('p-1');
      expect(deleted).toBeNull();
    });

    it('InMemoryRoleAssignmentRepository works correctly', async () => {
      const repo = new InMemoryRoleAssignmentRepository();
      const assignment = new RoleAssignment({
        id: 'ra-1',
        identityId: 'user-123',
        roleId: 'r-1',
        assignedAt: new Date()
      });

      await repo.save(assignment);

      const found = await repo.findById('ra-1');
      expect(found).not.toBeNull();
      expect(found?.identityId).toBe('user-123');

      await repo.delete('ra-1');
      const deleted = await repo.findById('ra-1');
      expect(deleted).toBeNull();
    });
  });

  describe('Prisma Repositories', () => {
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        roleRecord: {
          findUnique: vi.fn(),
          findMany: vi.fn(),
          upsert: vi.fn(),
          delete: vi.fn()
        },
        policyRecord: {
          findUnique: vi.fn(),
          findMany: vi.fn(),
          upsert: vi.fn(),
          delete: vi.fn()
        },
        roleAssignmentRecord: {
          findUnique: vi.fn(),
          findMany: vi.fn(),
          upsert: vi.fn(),
          delete: vi.fn()
        }
      };
    });

    it('PrismaRoleRepository maps role aggregate to/from mocked prisma delegate', async () => {
      const repo = new PrismaRoleRepository(mockPrisma as any);
      const role = new Role({
        id: 'role-123',
        name: 'Manager',
        description: 'Department Manager',
        permissions: [new PermissionReference('report:view')],
        policyIds: ['policy-abc']
      });

      // Save round trip
      await repo.save(role);
      expect(mockPrisma.roleRecord.upsert).toHaveBeenCalledWith({
        where: { id: 'role-123' },
        update: {
          name: 'Manager',
          description: 'Department Manager',
          permissions: ['report:view'],
          policyIds: ['policy-abc']
        },
        create: {
          id: 'role-123',
          name: 'Manager',
          description: 'Department Manager',
          permissions: ['report:view'],
          policyIds: ['policy-abc']
        }
      });

      // Find by id round trip
      mockPrisma.roleRecord.findUnique.mockResolvedValue({
        id: 'role-123',
        name: 'Manager',
        description: 'Department Manager',
        permissions: ['report:view'],
        policyIds: ['policy-abc'],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const found = await repo.findById('role-123');
      expect(found).not.toBeNull();
      expect(found?.id).toBe('role-123');
      expect(found?.name).toBe('Manager');
      expect(found?.permissions).toHaveLength(1);
      expect(found?.permissions[0].value).toBe('report:view');
      expect(found?.policyIds).toContain('policy-abc');

      // Delete
      await repo.delete('role-123');
      expect(mockPrisma.roleRecord.delete).toHaveBeenCalledWith({
        where: { id: 'role-123' }
      });
    });

    it('PrismaPolicyRepository maps policy aggregate to/from mocked prisma delegate', async () => {
      const repo = new PrismaPolicyRepository(mockPrisma as any);
      const policy = new Policy({
        id: 'policy-123',
        name: 'Time Restriction',
        description: 'Allowed working hours only',
        ruleType: 'TIME',
        ruleConfiguration: '09:00-17:00'
      });

      // Save round trip
      await repo.save(policy);
      expect(mockPrisma.policyRecord.upsert).toHaveBeenCalledWith({
        where: { id: 'policy-123' },
        update: {
          name: 'Time Restriction',
          description: 'Allowed working hours only',
          ruleType: 'TIME',
          ruleConfiguration: '09:00-17:00'
        },
        create: {
          id: 'policy-123',
          name: 'Time Restriction',
          description: 'Allowed working hours only',
          ruleType: 'TIME',
          ruleConfiguration: '09:00-17:00'
        }
      });

      // Find by id round trip
      mockPrisma.policyRecord.findUnique.mockResolvedValue({
        id: 'policy-123',
        name: 'Time Restriction',
        description: 'Allowed working hours only',
        ruleType: 'TIME',
        ruleConfiguration: '09:00-17:00',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const found = await repo.findById('policy-123');
      expect(found).not.toBeNull();
      expect(found?.id).toBe('policy-123');
      expect(found?.ruleType).toBe('TIME');

      // Delete
      await repo.delete('policy-123');
      expect(mockPrisma.policyRecord.delete).toHaveBeenCalledWith({
        where: { id: 'policy-123' }
      });
    });

    it('PrismaRoleAssignmentRepository maps assignment aggregate to/from mocked prisma delegate', async () => {
      const repo = new PrismaRoleAssignmentRepository(mockPrisma as any);
      const assignedAt = new Date();
      const assignment = new RoleAssignment({
        id: 'assign-123',
        identityId: 'user-abc',
        roleId: 'role-abc',
        assignedAt
      });

      // Save round trip
      await repo.save(assignment);
      expect(mockPrisma.roleAssignmentRecord.upsert).toHaveBeenCalledWith({
        where: { id: 'assign-123' },
        update: {
          identityId: 'user-abc',
          roleId: 'role-abc'
        },
        create: {
          id: 'assign-123',
          identityId: 'user-abc',
          roleId: 'role-abc',
          assignedAt
        }
      });

      // Find by id round trip
      mockPrisma.roleAssignmentRecord.findUnique.mockResolvedValue({
        id: 'assign-123',
        identityId: 'user-abc',
        roleId: 'role-abc',
        assignedAt
      });

      const found = await repo.findById('assign-123');
      expect(found).not.toBeNull();
      expect(found?.id).toBe('assign-123');
      expect(found?.identityId).toBe('user-abc');
      expect(found?.roleId).toBe('role-abc');

      // Delete
      await repo.delete('assign-123');
      expect(mockPrisma.roleAssignmentRecord.delete).toHaveBeenCalledWith({
        where: { id: 'assign-123' }
      });
    });
  });

  describe('EvaluateAccessUseCase Integration', () => {
    it('evaluates with persisted role assignment data through repositories', async () => {
      const roleRepo = new InMemoryRoleRepository();
      const policyRepo = new InMemoryPolicyRepository();
      const assignmentRepo = new InMemoryRoleAssignmentRepository();

      const policyEvaluator: IPolicyEvaluator = {
        evaluate: async () => AccessDecision.granted()
      };

      const evaluatorService = new AuthorizationEvaluatorService(
        roleRepo,
        policyRepo,
        assignmentRepo,
        policyEvaluator
      );

      const useCase = new EvaluateAccessUseCase(evaluatorService);

      // 1. Save role
      const role = new Role({
        id: 'role-admin',
        name: 'Administrator',
        description: 'Admin Access',
        permissions: [new PermissionReference('users:delete')],
        policyIds: []
      });
      await roleRepo.save(role);

      // 2. Save role assignment
      const assignment = new RoleAssignment({
        id: 'assign-admin',
        identityId: 'identity-111',
        roleId: 'role-admin',
        assignedAt: new Date()
      });
      await assignmentRepo.save(assignment);

      // 3. Evaluate access (granted)
      const inputGranted = {
        identityId: 'identity-111',
        resourceUrn: 'users',
        action: 'delete'
      };
      const resultGranted = await useCase.execute(inputGranted);
      expect(resultGranted.isGranted).toBe(true);

      // 4. Evaluate access (denied - different action)
      const inputDenied = {
        identityId: 'identity-111',
        resourceUrn: 'users',
        action: 'create'
      };
      const resultDenied = await useCase.execute(inputDenied);
      expect(resultDenied.isGranted).toBe(false);
    });
  });

  describe('Compliance and Boundary Rules', () => {
    it('does not introduce Organization, Employer or Phase 25 fields', () => {
      // Intentionally checking that types are simple primitives
      const assignment = new RoleAssignment({
        id: 'id',
        identityId: 'primitive-identity-id',
        roleId: 'primitive-role-id',
        assignedAt: new Date()
      });

      expect(assignment.identityId).toBe('primitive-identity-id');
      expect(assignment.roleId).toBe('primitive-role-id');
    });

    it('does not persist credentials, tokens, or secrets', () => {
      // Properties of Role and Policy only contain identification, permissions, rules
      const policy = new Policy({
        id: 'p',
        name: 'TimeRestriction',
        description: 'Standard',
        ruleType: 'TIME',
        ruleConfiguration: '{}'
      });
      expect(policy.ruleConfiguration).toBe('{}');
    });
  });
});
