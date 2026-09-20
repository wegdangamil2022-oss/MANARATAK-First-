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

`StudentToolsPublicRouter` is **not exempt**. Anonymous execution is scoped by the trusted anonymous-session token when present, otherwise by a network-derived fallback for the first request; the tool domain's own request fingerprint remains defense in depth.

## Client retry contract

Clients generate one key for a new semantic command and MUST reuse that exact key when retrying the same command after timeout or ambiguous transport failure. Supplying an explicit `Idempotency-Key` header always wins over automatic key generation.
