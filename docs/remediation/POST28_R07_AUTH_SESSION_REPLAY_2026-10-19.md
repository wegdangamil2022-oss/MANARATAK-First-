# R07 authenticated artifact session lifecycle and refresh replay fix

Source 642556ca18aefcd7af567915b3a1422394c0627f contains the unified R06/R07 implementation, including canonical Course provider ownership and the artifact HTTPS gateway.

## Implemented security fix

AuthService previously queried only active refresh sessions before invoking the atomic consume/rotate operation. Replaying an already-consumed parent therefore returned early and skipped the store's existing descendant-family revocation logic. The attacker-held child session remained usable. The fix routes inactive/missing-session cases through that existing atomic store operation before denying authentication; if an inconsistent implementation unexpectedly creates a child, it is revoked immediately. Independent login families are preserved. No new auth flow, schema or production configuration was introduced.

## Reproduction and final verification

The focused AuthService pack was 7 passed/1 failed before the fix and 8 passed after it. The new case proves descendant revocation while retaining another login family. Earlier c9264f4 artifacts independently reproduced the vulnerability over real HTTPS and PostgreSQL: consumed refresh returned 401 while the descendant /me still returned 200. That failed run is preserved under prior-source. The successful baseline session lifecycle and the initial missing AuditRecord INSERT grant failure are also retained.

After the source change, API/Web/Admin were rebuilt once and freshly unpacked. A clean production-only runtime was installed and independently unpacked; native engine and external modules were loaded from that layer. A new isolated PostgreSQL 16.15 cluster, system 7698157085792090108, applied all 110 migration checksums with schema parity. Only synthetic identities and locally generated scrypt credentials were seeded; passwords and auth cookies stayed in process memory. Runtime has application reads plus SessionRecord DML and AuditRecord INSERT only; checks prove no audit UPDATE/DELETE, schema CREATE or migration-ledger SELECT. No existing database/Neon/production was touched.

The final artifact-driven HTTPS run passed 29 observations, including repeated boot/route preconditions and the new authenticated session sequence. It proves wrong-password denial, real password login, Secure/HttpOnly/SameSite=Strict cookies, /me authentication, session-bound CSRF, denied refresh without CSRF with no session mutation, atomic parent-child rotation, old-access denial, logout revocation and replay denial. A second refresh family is deliberately replayed: the descendant now returns 401 and has no active descendant left, while an independent family for the same user still returns 200. The sessionFacts sessionRows=2 field refers to the first rotation subtest; later replay/independent-login checks add separate synthetic sessions. No browser interaction is claimed by these HTTP observations.

ESLint: zero errors and one existing any warning; source quality PASS. Unit cases were limited to the affected AuthService pack. The build was repeated because application code changed, not to inflate prior counts. A local helper SQL-string syntax mistake was corrected before that helper started any API or fixture operation.

## Remaining boundaries

This closes the measured refresh-replay programming defect and provides actual authenticated HTTP lifecycle proof. It is not complete browser acceptance or formal R06/R07 closure. Full worker-to-owner recovery, fresh certificate artifact ingestion, large-catalog source eligibility performance, symlink-capable tests, source CI and final acceptance gates remain separate. Windows process termination is not production graceful-drain evidence. No main merge, promotion or production deployment occurred.

Evidence: docs/reviews/evidence/post28/642556ca18aefcd7af567915b3a1422394c0627f/R07-authenticated-session-replay/evidence-index.json.
