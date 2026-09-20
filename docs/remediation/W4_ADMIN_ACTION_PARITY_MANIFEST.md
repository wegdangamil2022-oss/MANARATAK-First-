# W4 Admin Action Parity Manifest

Canonical source evidence for `MNT-AUD-0112`. Every action below is reachable from the Admin UI and terminates at an owner-domain API/use case. `/admin` inherits the canonical admin principal/session/identity guard, mandatory idempotency for mutations, and mutation audit middleware before route-specific RBAC.

| Admin surface/action | Owner API | RBAC | Validation / concurrency | Audit / result state |
|---|---|---|---|---|
| Career — create job | `POST /admin/careers/jobs` | `admin:careers:manage` | strict `jobSchema` | global immutable admin mutation audit; UI success/error/empty states |
| Career — edit job | `PATCH /admin/careers/jobs/:id` | `admin:careers:manage` | strict partial `jobSchema` + required `expectedVersion`; owner use case rejects stale writes | global immutable admin mutation audit; UI preserves canonical references and reloads owner result |
| Career — lifecycle | `POST /admin/careers/jobs/:id/{mark-publishable,publish,archive}` | `admin:careers:manage` | required `expectedVersion` + owner transition rules | global immutable admin mutation audit; UI disables invalid actions |
| Student Tools — metadata | `PATCH /admin/student-tools/:toolKey/metadata` | `admin:student-tools:manage` | `studentToolMetadataPatchSchema`; immutable/versioned fields rejected by owner use case | global immutable admin mutation audit; owner detail reload |
| Student Tools — availability | `PATCH /admin/student-tools/:toolKey/availability` | `admin:student-tools:manage` | strict availability + incremented semver + change note; conflicting availability rejected | global immutable admin mutation audit; versioned owner result reload |
| Student Tools — feature flags | `PATCH /admin/student-tools/:toolKey/flags` | `admin:student-tools:manage` | exact boolean contract + owner implementation guard | global immutable admin mutation audit; owner detail reload |
| Student Tools — admin test | `POST /admin/student-tools/:toolKey/test` | `admin:student-tools:manage` | bounded object input + locale; execution is explicitly `ADMIN_TEST`/`isTest` | global immutable admin mutation audit + execution/audit trail; UI renders real result/error |
| Student Tools — lifecycle | `POST /admin/student-tools/:toolKey/lifecycle/:action` | `admin:student-tools:manage` | strict action enum; activation requires owner readiness/implemented state | confirmation in UI + global immutable audit + owner detail reload |

## Negative-state contract

- Missing/invalid principal or inactive session/identity is rejected by the canonical `/admin` guard before owner routing.
- Missing route permission is rejected by route-specific RBAC.
- Every mutation requires a canonical idempotency key at `/admin` ingress.
- Career stale versions fail instead of last-write-wins.
- Student Tool invalid metadata/availability/test payloads fail strict edge parsing; immutable/versioned metadata misuse fails in the owner use case.
- Student Tool activation fails closed when readiness is not satisfied; lifecycle buttons require explicit confirmation.
- UI reloads canonical owner state after mutation and exposes failures rather than synthesizing success.
