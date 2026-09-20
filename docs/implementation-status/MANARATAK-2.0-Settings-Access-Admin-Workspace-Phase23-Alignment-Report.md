# MANARATAK 2.0 — Settings Workspace Historical Alignment Notice

**Original report date:** July 28, 2026  
**Superseded:** September 5, 2026  
**Status:** HISTORICAL / SUPERSEDED

The former “Settings & Access Control” preview combined admin users, role matrices, security policies, feature flags, integration health, secret-key status, and access logs in one screen and used hardcoded preview metrics. That design is **not** the current source of truth and must not be restored.

## Current ownership

- **Settings domain:** dynamic definitions, scoped non-secret assignments, feature-flag metadata, deterministic scope resolution, immutable version history, rollback-as-new-version.
- **Identity / Authorization:** admin users, roles, permissions, MFA/session/access policies, persisted RBAC decisions.
- **Audit:** security and mutation audit records.
- **Secret Provider / Environment:** API keys, passwords, signing keys, database credentials, provider tokens.
- **Health & Readiness:** integration/runtime health and readiness.
- **Reference Data / Academic Taxonomy:** canonical countries, currencies, languages, cities, academic classification, and standards.

The canonical Admin implementation is `apps/admin/src/pages/SettingsAdminPage.tsx` backed by the Settings API/domain. The legacy Web preview route is compatibility-only and redirects to the canonical Admin application; it must contain no demo users, counters, tokens, or fake access-control state.
