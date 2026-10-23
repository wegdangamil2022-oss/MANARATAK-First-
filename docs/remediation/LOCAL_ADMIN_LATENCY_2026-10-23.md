# Local admin latency investigation

## Observed causes

- Runtime access logs recorded a major root read at 10,933 ms, profiles at 8,638 ms, aliases at 55,640 ms, classification mappings at 26,690 ms, and a taxonomy picker at 128,461 ms. These are observed requests, not a controlled before/after benchmark.
- A restricted read-only PostgreSQL probe measured consecutive pooled `SELECT 1` round trips at 975, 1,563 and 877 ms. The direct-host probe failed. This workstation's database connection is therefore a material source of latency; this evidence does not isolate the provider from the intervening network.
- Major details waited for five root/related requests before showing the header, and only then requested profile content. Slow secondary reads held back the entire page.
- Admin authentication and `/auth/me` each repeated the lifecycle validation within a single token-authenticated request.
- The second server disappearance had no new exception in the runtime log, and its foreground execution session was gone. The local launcher now runs as a separate hidden Windows process. No automatic restart on arbitrary errors or authentication bypass was added.

## Changes and verification

- Show the major header and profile selection after the two essential reads. Fetch content before launching aliases, relationships and classification mappings in the background. Loading/error labels distinguish unknown related data from an empty result. Existing generation checks discard stale responses.
- Reuse a successful lifecycle check only inside the same request. Subsequent requests still validate session activity and lifecycle. No cross-request authorization cache or extra database privileges.
- All five focused authentication regression cases pass, including suspension on the next request and storage-failure containment. Admin type checking and its static build pass.
- A browser test deliberately held secondary responses pending. The old artifact failed to show its header within 3.5 seconds; the new artifact showed it at 638 ms while those responses remained pending. This is a synthetic scheduling test, not a claim about live database speed.
- The changed details page passed the relevant browser regressions: unsaved edits, profile switching, publish permission, readiness and confirmation, retained review drafts, keyboard tabs, responsive layouts and Cairo typography.

## Remaining limits

A live navigation baseline attempt timed out before receiving the login response after 90 seconds. Full real-account latency is not marked resolved. The local gateway still permits authentication and read diagnostics only; content writes and background workers remain disabled. No Neon configuration, migration, schema, role or paid service was changed.

Private evidence is under `private/owner-account-20261023` and `private/admin-performance-20261023`; these artifacts are not committed because they belong to the local runtime.

## Follow-up: false authentication expiry during storage failure

The first live run after progressive loading completed login in 37,418 ms and showed cards in 15,652 ms. Details still took 133,212 ms: the profiles request returned 401 after 30,017 ms, followed by a 46,278 ms CSRF bootstrap and 40,124 ms refresh. This trial exposed a second defect; it is not recorded as an acceptable latency result.

The token bootstrap path caught both invalid signatures and failed storage reads as authentication denial. The lifecycle validator also converted storage exceptions to `false`, making a database outage indistinguishable from an inactive account. It now throws a sanitized `AUTHENTICATION_STATE_UNAVAILABLE` error on lookup failure. Admin bootstrap and current-user boundaries return 503 for storage failures, without revoking sessions or granting access. Login also reports this specific lifecycle lookup failure as temporary unavailability. Explicit inactive/missing/disabled states still deny authentication. Password verification, login postchecks, MFA, audit and session rotation remain in place.

All 12 focused regression cases pass, including session and lifecycle outages in both admin and current-user routes, genuine inactive-account rejection, validation on subsequent requests, error sanitization and process-liveness protection. The application package build passes. Broader student/refresh outage response semantics have not been redesigned in this patch.
