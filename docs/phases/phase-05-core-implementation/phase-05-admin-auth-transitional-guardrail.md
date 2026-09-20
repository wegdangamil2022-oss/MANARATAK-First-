# Phase 05 — Admin & Auth Transitional Security Guardrail

## Overview

This specification documents the security boundaries and transitional guardrails surrounding Admin Portal access, API middleware authentication, and environment configuration in MANARATAK 2.0.

---

## Key Principles & Guardrails

1. **Demo Bridge is Local-Preview Only**:
   - The `ADMIN_AUTH_MODE=demo` bridge and `/admin-preview` routes exist solely for local development, interactive testing, and UI preview workflows.
   - Demo mode assigns synthetic super-admin context (`DEMO_SUPER_ADMIN`) and must never be treated as production authentication.

2. **Production Must Set `ADMIN_AUTH_MODE=strict` or `bearer`**:
   - In production environments (`NODE_ENV=production`), the API requires explicit strict token verification via `ADMIN_BEARER_TOKEN`.
   - Both `strict` and `bearer` string values map to strict Bearer token authentication.

3. **Production Fails Closed**:
   - If `NODE_ENV=production` and `ADMIN_AUTH_MODE` is missing, invalid, or set to `demo`, the API startup fails closed by throwing a configuration error.
   - Implicit fallback to demo mode in production is strictly forbidden.

4. **Phase Ownership Boundaries**:
   - **Phase 05 (Core Implementation & Foundation)**: Owns production IAM, RBAC permission models, JWT token issuance, session management, and rate limiting/security adapters.
   - **Phase 23 (Admin Portal & Control Plane Orchestration)**: Owns Admin Portal UI orchestration, admin control plane views, and admin workspace security context integration.
   - **Phase 02 (Monorepo Foundation & Alignment)**: Defines structural boundaries and must not treat demo authentication as production complete.

5. **Deferred Integrations**:
   - **Audit Logging Integration**: State-changing admin operations currently rely on core audit log abstractions; full automated audit event wiring across all admin endpoints remains deferred to Phase 05 / Phase 23 implementation.
   - **OAuth / SSO Enterprise Bridge**: OAuth / enterprise identity provider wiring is owned by Phase 05.

---

## Runtime Verification Matrix

| Environment | `ADMIN_AUTH_MODE` | Resolved Mode | Behavior |
| :--- | :--- | :--- | :--- |
| `production` | Missing / Unset | Error | **Fails Closed** (Throws configuration error) |
| `production` | `demo` | Error | **Fails Closed** (Throws configuration error) |
| `production` | `strict` / `bearer` | `strict` | Validates Bearer token via constant-time comparison |
| `development` | Missing / Unset | `demo` | Defaults to demo mode with security warning |
| `development` | `demo` | `demo` | Bypasses token check; assigns `DEMO_SUPER_ADMIN` |
| `development` | `strict` / `bearer` | `strict` | Validates Bearer token |

