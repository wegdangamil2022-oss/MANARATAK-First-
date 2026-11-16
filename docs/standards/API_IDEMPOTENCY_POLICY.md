# MANARATAK Canonical API Idempotency Policy

Status: **ACTIVE**  
Standard: `STD-API-001`  
Remediation: `MNT-AUD-0098`

## Required command boundary

All authenticated `POST`, `PUT`, and `PATCH` mutation commands under the canonical Admin, legacy authenticated control-plane aliases, Student Workspace, and Student Course APIs require `Idempotency-Key`.

The durable command identity is scoped by authenticated principal, HTTP method, normalized route/resource, and the hash of the supplied key. The persisted request fingerprint binds the key to the semantic payload. Same-key/same-fingerprint replay returns the recorded terminal response; same-key/different-fingerprint reuse is rejected with `409`.

The default retention window is 24 hours. Expired records are no longer authoritative for replay and can be reclaimed. Domain-level idempotency (Finance, AI/tools, provider request keys) remains defense in depth and does not replace this API command identity.

## Approved exemptions

These `POST` surfaces are not state-changing API commands under `STD-API-001`, or have a separately declared bootstrap identity contract:

- `AuthRouter`: login/refresh/logout bootstrap session lifecycle. Login/refresh cannot be principal-scoped before authentication; refresh rotation has its own single-use/replay lineage controls.
- `SearchRouter POST /`: query/read command. Search persistence is operational request history, not owner-domain mutation authority.
- `AuthorizationRuntimeRouter POST /evaluate`: pure authorization decision query.

`StudentToolsPublicRouter` requires `Idempotency-Key`, but keeps replay custody in the student-tool owner. Execution intents bind the key and payload to an opaque requester reference; recoverable output stays encrypted in the owner store. Save/claim writes use the private workspace's student/execution identity. No public student-tool response or anonymous bearer token may enter the generic plaintext response store, regardless of route spelling or validation outcome.

## Authorization of administrative response replay

Every generic authenticated control-plane boundary records the successful action authorization checks and resource attributes evaluated downstream of that boundary. The API evaluator captures these checks in request-local async context. Stored responses carry an internal authorization envelope; clients receive only the original response body.

Before returning a stored response, the boundary re-evaluates every recorded permission for the same authenticated principal using current role assignments, duty restrictions, policies, request time and network context. A revoked permission or expired policy returns `403 IDEMPOTENCY_REPLAY_PERMISSION_DENIED` without disclosing the receipt or executing the command again. An authorization failure or evaluator error never permits fallback to the recorded body.

Historical receipts without authorization evidence, empty evidence, and unsupported complex policy attributes fail closed. They are not deleted or treated as new commands. Separately excluded owner command protocols retain their own resource authorization and replay contracts. This generic mechanism records IAM decisions; it does not replace owner-level ownership, assignment, or state validation.

## Client retry contract

Clients generate one key for a new semantic command and MUST reuse that exact key when retrying the same command after timeout or ambiguous transport failure. Supplying an explicit `Idempotency-Key` header always wins over automatic key generation.
