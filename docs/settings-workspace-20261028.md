# Settings workspace review and implementation

Approved implementation scope for the user's settings reorganization request, 2026-10-28.

The existing canonical Settings owner already supplies typed definitions, scoped assignments, immutable versions, restore-as-new-version, bounded cursor reads, effective-value inspection, constraints, dependency rules and independent approval of atomic change sets. Retain that authority and its CAS/audit/outbox contracts.

## Review decision

Organize six clear workspaces: overview, definition catalog, values/scopes/history, feature flags, change sets/dependencies/approvals, and effective-value inspection. Preserve Cairo, compact typography, indigo/petrol headers, petrol primary actions and indigo/gold selected navigation. Replace always-visible creation sidebars and browser prompts with deliberate editors and reviewed actions. Search/filter state belongs in the URL; pagination remains bounded. Show current-page counts only, never invented totals.

Complete the missing operational details: discard/close protection, explicit change reasons and before/after review, impact before deprecation, restore and inheritance confirmation, direct entry from definition to scoped value/inspection, clear/reset/retry controls, expiry-aware approval state, request-generation isolation, canonical scope pickers and verification that an approver still has administrative access. Secret requirements stay metadata only; a feature flag must be a non-secret Boolean with an explicit default.

The review follows the useful patterns in [LaunchDarkly approvals](https://launchdarkly.com/docs/home/releases/approvals/), [change history](https://launchdarkly.com/docs/fed-docs/home/releases/change-history), and [AWS AppConfig validation and rollback](https://docs.aws.amazon.com/appconfig/latest/userguide/). These sources inform review, traceability and validation; they do not establish automatic rollout or provider integration in this project.

## Boundaries

No schema change, seed, original acceptance-data writes, role/account/MFA changes, external provider/worker activation, secret-value storage/export or production deployment. Preserve legacy TENANT reads without enabling unsupported mutations. Keep identity/authorization, audit, health and reference-data controls in their actual owner sections. Do not invent missing runtime consumers, global deployment environments, automatic scheduled rollout or provider readiness.

## Implemented and checked

The six workspaces, scoped editors, review dialogs, impact gate, expiry-aware inbox, canonical inspector contexts, discard guard and exact-request retry are implemented. The existing Settings owner continues to enforce types, constraints, CAS, immutable versions, audit and atomic change-set approval. Reviewer discovery, approval and commit additionally check the existing staff administrative-access fence. Generic Settings receipt replay now checks the current Settings permission before returning a receipt.

Validation completed: 165 tests across 22 suites (including 13 workspace/model interactions, approver access, Settings domain/application/persistence boundaries and service/finance regressions), 26 Node contracts, 81 academic/settings source checks, API/admin TypeScript, admin build, and the existing audit coverage gate. The schema-ownership source test now normalizes Windows line endings before deriving its comparison schema; the reviewed migration SQL is unchanged.

A read-only transaction against the original local Neon configuration, using the restricted application role, verified the four existing Settings tables, expected ORM columns and command privileges. At inspection there were zero definitions, assignments, versions and governance records. Empty lists reflect the real database; no examples or defaults were inserted. No schema or acceptance-data writes were made. Runtime delivery checks are kept outside the repository in the local verification artifacts. Authenticated visual acceptance is not claimed; the existing sign-in and MFA remain required.
