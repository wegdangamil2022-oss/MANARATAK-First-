import { describe, it, expect } from 'vitest';
import {
  AuthorizationEvaluatorService,
  Policy,
  Role,
  RoleAssignment,
  PermissionReference,
} from '@manaratak/domain';
import { DefaultPolicyEvaluator } from '../../src/authorization/DefaultPolicyEvaluator';
import { ManagePoliciesUseCase } from '../../../application/src/authorization/use-cases/ManagePoliciesUseCase';
const a = '10000000-0000-4000-8000-000000000001',
  b = '10000000-0000-4000-8000-000000000002';
const definitions = new ManagePoliciesUseCase({} as never);
describe('canonical IAM course scope', () => {
  const policy = (id: string, courseId: string) =>
    definitions.definition({
      id,
      name: id,
      description: 'Course scope',
      ruleType: 'COURSE_SCOPE',
      configuration: { courseIds: [courseId] },
    });
  it('does not combine editor authority for one course with grader authority for another', async () => {
    const policies = [policy('A', a), policy('B', b)];
    const roles = [
      new Role({
        id: 'editor',
        name: 'Editor',
        description: '',
        permissions: ['admin:courses:workspace', 'admin:courses:read', 'admin:courses:edit'].map(
          (value) => new PermissionReference(value),
        ),
        policyIds: ['A'],
      }),
      new Role({
        id: 'grader',
        name: 'Grader',
        description: '',
        permissions: ['admin:courses:workspace', 'admin:courses:read', 'admin:courses:grade'].map(
          (value) => new PermissionReference(value),
        ),
        policyIds: ['B'],
      }),
    ];
    const evaluator = new AuthorizationEvaluatorService(
      { findById: async (id: string) => roles.find((row) => row.id === id) } as never,
      { findById: async (id: string) => policies.find((row) => row.id === id) } as never,
      {
        findByIdentityId: async () =>
          roles.map(
            (row) =>
              new RoleAssignment({
                id: row.id,
                identityId: 'teacher',
                roleId: row.id,
                assignedAt: new Date(),
              }),
          ),
      } as never,
      new DefaultPolicyEvaluator(),
    );
    for (const [action, id, allowed] of [
      ['edit', a, true],
      ['edit', b, false],
      ['grade', a, false],
      ['grade', b, true],
      ['publish', a, false],
    ] as const)
      expect(
        (await evaluator.evaluatePermission('teacher', 'admin:courses:' + action, { courseId: id }))
          .isGranted,
      ).toBe(allowed);
    expect(
      (await evaluator.evaluatePermission('teacher', 'admin:courses:workspace')).isGranted,
    ).toBe(true);
    expect((await evaluator.evaluatePermission('teacher', 'admin:courses:edit')).isGranted).toBe(
      false,
    );
    expect(
      (await evaluator.evaluatePermission('teacher', 'admin:certificates:issue', { courseId: a }))
        .isGranted,
    ).toBe(false);
  });
  it.each([
    {},
    { courseIds: [] },
    { courseIds: [a, a] },
    { courseIds: ['*'] },
    { courseIds: [a], start: '00:00' },
  ])('rejects malformed or open course scopes %j', (configuration) => {
    expect(() =>
      definitions.definition({
        id: 'p',
        name: 'Scope',
        description: '',
        ruleType: 'COURSE_SCOPE',
        configuration,
      }),
    ).toThrow();
  });
  it('does not let a course policy authorize another resource even with an assigned ID', async () => {
    const evaluator = new DefaultPolicyEvaluator();
    expect(
      (
        await evaluator.evaluate(policy('A', a), {
          identityId: 'teacher',
          resourceUrn: { value: 'admin:finance' } as never,
          action: { value: 'workspace' } as never,
          courseId: a,
        })
      ).isGranted,
    ).toBe(false);
    expect(
      (
        await evaluator.evaluate(
          new Policy({
            id: 'invalid',
            name: 'Bad',
            description: '',
            ruleType: 'COURSE_SCOPE',
            ruleConfiguration: 'not-json',
          }),
          {
            identityId: 'teacher',
            resourceUrn: { value: 'admin:courses' } as never,
            action: { value: 'read' } as never,
            courseId: a,
          },
        )
      ).isGranted,
    ).toBe(false);
  });
});
