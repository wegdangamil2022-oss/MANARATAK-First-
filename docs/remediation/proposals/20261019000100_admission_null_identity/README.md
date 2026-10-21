# DEC06 migration review package

Status: IMPLEMENTED_AND_LAB_VERIFIED / NOT_APPROVED_FOR_ACTIVE_MIGRATION_TREE.

SQL: migration.sql; immutable implementation source 7efa51061a9c9c1a739928d7c8799a6a74108393.

See ../../POST28_R06_NULL_IDENTITY_REPAIR_2026-10-19.md for actual ordinary-role direct-writer/concurrency/rollback, duplicate preservation and Prisma5.22 proof, remaining review decisions and exact rollout boundary.

The preserved earlier R06_DEC06_NULL_UNIQUENESS_NOT_APPLIED.sql is the original exploratory proposal. This package supersedes it as the tested candidate without deleting that historical proposal. No deployment approval is implied.
