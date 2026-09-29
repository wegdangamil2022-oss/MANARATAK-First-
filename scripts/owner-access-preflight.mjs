#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

export async function inspectOwnerAccess(prisma, { identityId, verifiedEmail }) {
  if (!identityId?.trim() || !verifiedEmail?.trim()) throw new Error('OWNER_IDENTITY_AND_VERIFIED_EMAIL_REQUIRED');
  const identity = await prisma.identityRecord.findUnique({
    where: { id: identityId.trim() },
    select: { id: true, status: true, deletedAt: true, user: { select: { primaryEmail: true, isEmailVerified: true } },
      account: { select: { accessState: true } } },
  });
  if (!identity || identity.deletedAt || identity.status !== 'ACTIVE' || identity.account?.accessState !== 'Active'
    || !identity.user?.isEmailVerified || identity.user.primaryEmail.trim().toLowerCase() !== verifiedEmail.trim().toLowerCase()) {
    return { status: 'BLOCKED_IDENTITY_MISMATCH', activeAdminRoleIds: [], assignmentCount: 0, otherAdminAssignmentCount: 0 };
  }
  const assignments = await prisma.roleAssignmentRecord.findMany({ where: { identityId: identity.id },
    include: { role: { select: { id: true, permissions: true } } } });
  const roles = await prisma.roleRecord.findMany({ select: { id: true, permissions: true } });
  const adminRoleIds = roles.filter(role => Array.isArray(role.permissions) && role.permissions.some(permission =>
    permission === '*' || (typeof permission === 'string' && permission.startsWith('admin:')))).map(role => role.id);
  const administrativeAssignments = adminRoleIds.length ? await prisma.roleAssignmentRecord.findMany({
    where: { roleId: { in: adminRoleIds } }, select: { identityId: true, roleId: true },
  }) : [];
  const otherAdminAssignmentCount = administrativeAssignments.filter(item => item.identityId !== identity.id).length;
  const activeAdminRoleIds = assignments.filter(({ role }) => Array.isArray(role?.permissions) &&
    role.permissions.some(permission => permission === '*' || permission === 'admin:*'))
    .map(({ role }) => role.id);
  const partialAdminAssignments = assignments.some(({ role }) => Array.isArray(role?.permissions) &&
    role.permissions.some(permission => typeof permission === 'string' && permission.startsWith('admin:')));
  const existingBootstrap = await prisma.auditRecord.findUnique({ where: { reference: 'FIRST_ADMIN_BOOTSTRAP_ONCE' },
    select: { targetId: true } });
  return {
    status: activeAdminRoleIds.length ? 'READY' : existingBootstrap ? 'BLOCKED_REVIEW_EXISTING_BOOTSTRAP'
      : otherAdminAssignmentCount ? 'BLOCKED_REVIEW_OTHER_ADMIN_ASSIGNMENTS'
      : partialAdminAssignments ? 'BLOCKED_REVIEW_PARTIAL_AUTHORITY' : 'NEEDS_CONTROLLED_BOOTSTRAP',
    activeAdminRoleIds,
    assignmentCount: assignments.length,
    otherAdminAssignmentCount,
  };
}

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const result = await inspectOwnerAccess(prisma, {
      identityId: process.env.FIRST_ADMIN_IDENTITY_ID,
      verifiedEmail: process.env.FIRST_ADMIN_VERIFIED_EMAIL,
    });
    console.log(JSON.stringify(result));
    if (result.status !== 'READY') process.exitCode = 1;
  } finally { await prisma.$disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('OWNER_ACCESS_PREFLIGHT_FAILED'); process.exitCode = 1; });
}
