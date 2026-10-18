# R06 provider ownership implementation on the unified R06/R07 branch

Implementation 6363ef7be389c5ab1850e13cc4df78a61132f558. Imported Course link verification previously selected the newest ACTIVE identity regardless of its provider. Admin detail and publication link health used the same unsafe first identity. A newer foreign-provider identity could therefore supply verification or receive link-check history intended for the canonical provider.

The repository now selects the newest identity within Course.externalProviderId for all three paths. The premature relation take:1 was removed so a foreign row cannot hide an older matching owner row. The verification context hydrates providerId for the equality check; a missing canonical provider or only foreign evidence produces no source identity and no borrowed VERIFIED link health. Existing transaction/URL locks, stale-result guard and audited publication boundary remain.

Five new focused tests failed before implementation (0/5 pass), then passed (5/5). They cover a newer foreign identity, foreign-only evidence, unassigned provider, consistent admin/verification ownership and denial of borrowed publication link health. Infrastructure type checking passes. No repeat of the 312-unit suite or full database scenario pack was needed for this selection change. No fresh PostgreSQL verification is claimed for this final SHA.

R07 integration source c9264f40eef75ca5ab5142707f30f4203d381d60 remains separately identified: five transport tests and 11 actual HTTPS observations from fresh artifacts prove the new local gateway wiring; those artifacts are not relabelled with this later source fix. Full authenticated browser/session lifecycle, full worker-to-owner recovery, full fresh certificate asset ingestion, large-catalog source-proof performance and final exact-SHA gates remain. R06/R07 are not declared fully closed.

No schema, historical Consent/Binding, role or production configuration changed. The current unified branch includes R06 55d4239 and the preserved R07 artifact work; R05 and main remain untouched.

Evidence: docs/reviews/evidence/post28/6363ef7be389c5ab1850e13cc4df78a61132f558/R06-provider-ownership/evidence-index.json.
