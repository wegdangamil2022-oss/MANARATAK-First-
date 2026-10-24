# Original development database activation

The user explicitly requested activation on the original database and the admin URL on 2026-10-24, and waived the formal 200% browser text zoom acceptance test. This authorizes the reviewed additive review-workspace migration and local original-database runtime, not a main merge or external production deployment.

The last UI correction makes command conflicts visible inside the preview, instead of only behind its backdrop. Its regression test fails with the old behavior and passes with the correction. Existing owner authorization, fresh MFA and optimistic version checks remain unchanged.

Activation sequence: verify the exact existing development target and migration ledger; create a private complete backup and verify restore/upgrade on a new isolated local database; apply only the one pending additive migration through the normal mutation gate; verify existing business rows and historical migration entries unchanged; start the canonical runtime with the existing MFA encryption key and scoped analytics worker. No synthetic records are imported into the original database. Runtime/source evidence stays private, with a sanitized result added after verification.
