import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CertificateStudentSavedItemHydrationGateway,
  StudentToolPrivateSavedItemHydrationGateway,
} from '../../../packages/infrastructure/src/students/PrivateStudentSavedItemHydrationGateways';
import { StudentSavedItemHydrationService } from '../../../packages/application/src/students/use-cases/StudentSavedItemHydrationService';
import { PrismaStudentWorkspaceRepository } from '../../../packages/infrastructure/src/students/PrismaStudentWorkspaceRepository';
const saved = {
  id: 'saved',
  studentReferenceId: 'student',
  entityType: 'CERTIFICATE',
  entityId: 'certificate',
} as any;
test('private saved certificate: exact student ownership is passed to owner repository', async () => {
  let scope: any;
  const gateway = new CertificateStudentSavedItemHydrationGateway({
    findForStudent: async (...args: any[]) => {
      scope = args;
      return {
        id: 'certificate',
        publicId: 'public',
        studentReferenceId: 'student',
        achievementDisplayName: 'Course',
        status: 'REVOKED',
      };
    },
  } as any);
  const result = await gateway.hydrate(saved);
  assert.deepEqual(scope, ['certificate', 'student']);
  assert.equal(result.visibility, 'STUDENT_PRIVATE');
  assert.equal(result.lifecycleStatus, 'REVOKED');
  assert.equal(result.available, true);
  assert.equal(result.privateReference, 'certificate');
});
test('private saved certificate: foreign certificate and missing owner return no private identity', async () => {
  for (const row of [
    null,
    { id: 'foreign', studentReferenceId: 'other', achievementDisplayName: 'Secret' },
  ]) {
    const gateway = new CertificateStudentSavedItemHydrationGateway({
      findForStudent: async () => row,
    } as any);
    const result = await gateway.hydrate(saved);
    assert.equal(result.available, false);
    assert.equal(JSON.stringify(result).includes('Secret'), false);
    assert.equal('publicId' in result, false);
  }
});
test('private saved tool: retained owner-scoped copy is required even for caller-forged metadata', async () => {
  const item = {
    ...saved,
    entityType: 'STUDENT_TOOL',
    entityId: 'execution',
    metadata: { artifactReference: 'execution', privateResult: 'forged' },
  };
  const unavailable = new StudentToolPrivateSavedItemHydrationGateway({
    inspectPrivateToolResult: async () => null,
  } as any);
  assert.equal((await unavailable.hydrate(item)).available, false);
  let scope: any;
  const gateway = new StudentToolPrivateSavedItemHydrationGateway({
    inspectPrivateToolResult: async (...args: any[]) => {
      scope = args;
      return { savedReference: 'retained-copy', toolKey: 'retired-tool' };
    },
  } as any);
  const result = await gateway.hydrate(item);
  assert.deepEqual(scope, ['student', 'execution']);
  assert.equal(result.visibility, 'STUDENT_PRIVATE');
  assert.equal(result.privateReference, 'retained-copy');
  assert.equal(JSON.stringify(result).includes('forged'), false);
});
test('private hydration: foreign rows are discarded before any owner lookup', async () => {
  let called = false;
  const service = new StudentSavedItemHydrationService(
    {
      listSavedItems: async () => [
        { ...saved, studentReferenceId: 'other', displayName: 'Foreign private title' },
      ],
    } as any,
    [
      {
        supports: () => true,
        hydrate: async () => {
          called = true;
          return null;
        },
      },
    ],
  );
  assert.deepEqual(await service.listHydrated('student'), []);
  assert.equal(called, false);
});
function privateRepo(change: { row?: any; envelope?: any } = {}) {
  const row =
    change.row === undefined
      ? {
          id: 'saved',
          studentReferenceId: 'student',
          entityId: 'execution',
          entitySlug: 'tool',
          privateResultEnvelope: { ciphertext: 'private' },
          privateResultExpiresAt: new Date('2099-01-01'),
        }
      : change.row;
  const db = {
    studentWorkspace: { findUnique: async () => ({ status: 'ACTIVE' }) },
    studentSavedItem: { findUnique: async () => row },
  };
  const repository = new PrismaStudentWorkspaceRepository(db as any);
  (repository as any).privateResults = {
    status: () => 'READY',
    unprotect: () =>
      change.envelope ?? {
        purpose: 'STUDENT_TOOL_RESULT',
        owner: 'student',
        executionId: 'execution',
        expiresAt: new Date('2099-01-01').toISOString(),
        result: { private: 'not projected' },
      },
  };
  return repository;
}
test('private retained artifact inspection: valid purpose, expiry and owner yield minimal reference only', async () => {
  const result = await privateRepo().inspectPrivateToolResult('student', 'execution');
  assert.deepEqual(result, { savedReference: 'saved', toolKey: 'tool' });
  assert.equal(JSON.stringify(result).includes('not projected'), false);
});
test('private retained artifact inspection: foreign envelope and expired retention fail closed', async () => {
  const other = privateRepo({
    envelope: {
      purpose: 'STUDENT_TOOL_RESULT',
      owner: 'other',
      executionId: 'execution',
      expiresAt: new Date('2099-01-01').toISOString(),
    },
  });
  assert.equal(await other.inspectPrivateToolResult('student', 'execution'), null);
  const expired = privateRepo({
    row: {
      studentReferenceId: 'student',
      privateResultEnvelope: {},
      privateResultExpiresAt: new Date('2000-01-01'),
    },
  });
  assert.equal(await expired.inspectPrivateToolResult('student', 'execution'), null);
});
