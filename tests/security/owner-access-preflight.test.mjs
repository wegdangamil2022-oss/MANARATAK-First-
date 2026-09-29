import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectOwnerAccess } from '../../scripts/owner-access-preflight.mjs';

const identity = { id: 'stable-owner-id', status: 'ACTIVE', deletedAt: null,
  user: { primaryEmail: 'owner@example.test', isEmailVerified: true }, account: { accessState: 'Active' } };
function fixture({ account = identity, assignments = [], allAssignments = [], roles = [], bootstrap = null } = {}) {
  return { identityRecord: { findUnique: async () => account }, roleRecord: { findMany: async () => roles },
    roleAssignmentRecord: { findMany: async args => args.where.identityId ? assignments : allAssignments },
    auditRecord: { findUnique: async () => bootstrap } };
}
const request = { identityId: 'stable-owner-id', verifiedEmail: 'OWNER@example.test' };

test('preflight confirms an existing persisted owner assignment without writing', async () => {
  const result = await inspectOwnerAccess(fixture({ assignments: [{ role: { id: 'administrator', permissions: ['admin:*'] } }] }), request);
  assert.deepEqual(result, { status: 'READY', activeAdminRoleIds: ['administrator'], assignmentCount: 1, otherAdminAssignmentCount: 0 });
});
test('preflight blocks a mismatched or unverified identity before reading assignments', async () => {
  for (const account of [{ ...identity, user: { ...identity.user, isEmailVerified: false } },
    { ...identity, user: { ...identity.user, primaryEmail: 'other@example.test' } }]) {
    assert.equal((await inspectOwnerAccess(fixture({ account }), request)).status, 'BLOCKED_IDENTITY_MISMATCH');
  }
});
test('preflight distinguishes a missing assignment from an earlier bootstrap needing review', async () => {
  assert.equal((await inspectOwnerAccess(fixture(), request)).status, 'NEEDS_CONTROLLED_BOOTSTRAP');
  assert.equal((await inspectOwnerAccess(fixture({ bootstrap: { targetId: request.identityId } }), request)).status, 'BLOCKED_REVIEW_EXISTING_BOOTSTRAP');
  assert.equal((await inspectOwnerAccess(fixture({ assignments: [{ role: { id: 'limited', permissions: ['admin:universities:manage'] } }] }), request)).status, 'BLOCKED_REVIEW_PARTIAL_AUTHORITY');
  const otherAdmin = fixture({ roles: [{ id: 'administrator', permissions: ['admin:*'] }],
    allAssignments: [{ identityId: 'another-account', roleId: 'administrator' }] });
  const result = await inspectOwnerAccess(otherAdmin, request);
  assert.equal(result.status, 'BLOCKED_REVIEW_OTHER_ADMIN_ASSIGNMENTS');
  assert.equal(result.otherAdminAssignmentCount, 1);
});
