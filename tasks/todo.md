# MANARATAK execution checklist

Scope and acceptance criteria: [plan.md](plan.md).

- [x] Reference currencies/languages/countries: 622 rows independently verified.
- [ ] 1. Review existing geography sources and quarantine reports; record eligible
  rows, hashes, conflicts and unresolved rows without changing the database.
- [ ] 2. Rebind required-baseline preparation, verify fresh backup/identity,
  install degree/taxonomy/provider/student-tool definitions and reconcile.
- [ ] Checkpoint A: baseline source relationships and protected fingerprints pass;
  geographic eligibility is explicit; no provider or student tool was executed.
- [ ] 3. Install the reviewed region/city candidate set through owner workflows;
  verify country/region links and keep unresolved rows deferred.
- [ ] 4. Fix least-privilege schema readiness; complete gated development admin
  access and prove installed choices can be read through the authenticated API.
- [ ] Checkpoint B: application/admin run against the intended independent target;
  readiness limitations and relevant permission checks have actual evidence.
- [ ] 5. Preview the new scholarship master, resolve required relations, and
  import eligible records with source-count reconciliation.
- [ ] 6. Prove one browser author/review/publish/public-view/withdraw flow using
  actual bundles and synthetic test fixtures where needed.
- [ ] Checkpoint C: end-to-end development flow succeeds; unresolved critical
  risks are explicit; completion claims match observed evidence.
- [ ] 7. Push reviewed increments, inspect relevant CI, and prepare hosting/release
  requirements without external deployment or paid service creation.
