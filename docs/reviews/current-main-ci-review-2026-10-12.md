# Current main CI review (2026-10-12)

Reviewed main: `4af2c2cf66` (full hash retained by the branch merge parent). This main includes the separately integrated sections 24/25; PR 25's earlier verified fixes were still unmerged. The repair branch now preserves those main changes and carries forward its existing source fixes.

Observed failures: main architecture run `38202950456` (unclassified isolated Service regression), Enterprise run `38202950425` (Health modal keyboard finding, stale environment inventory, translation namespace confusion). The earlier imported-course typecheck failure at `52ad7c63` was the redundant CMS status-badge hook already removed by `4af2c2cf`; that fix is retained.

Additional repairs:

- Use an actual backdrop button for the Health dialog, retaining its explicit close button, focus containment, Escape behavior and return focus.
- Resolve the lexical binding of UI translators from the canonical provider, including aliases/callbacks/shadowing. Local typed Health messages no longer appear as missing global UI keys. Tests retain detection of genuinely missing shared keys; every app must have detected canonical calls.
- Reconcile source reachability for `workerHealthObservation` (375 registrations) and regenerate the name-only environment inventory (260 variables). Mirror `HEALTH_DEPLOYMENT_REVISION` in both environment examples with an empty placeholder, never claiming a deployed revision.
- Move the three section-24 evidence files to `docs/reviews/evidence/section-24` and update citations; recognize the explicit Health Vitest config in the repository layout policy. Normalize only trailing evidence whitespace.
- Restore the explicit `NOT_CONFIGURED` capability when no readiness probes exist. The result remains DOWN; diagnostic component extraction continues to ignore non-component metadata.
- Supply real MemoryRouter context to CMS static-render fixtures; make the W6 startSpan declaration check independent of line breaks.
- Preserve the semantic Health source wrapper's canonical PASS/FAIL marker based on the actual test exit status. Finance checks the canonical launch manifest and app registration for the payment probe instead of an obsolete router literal.
- Give the deterministic two-document, real embedded-font rendering test a bounded 30-second functional budget. It failed the generic five-second budget at 8.6 seconds under concurrent local build/test load and passed alone; all PDF/preview byte equality assertions remain intact. Runtime timeouts and all other test budgets are unchanged.

Validation before publication: full-workspace build and Vercel's four TypeScript contexts passed; source quality, environment, repository layout and preflight passed. The first full Vitest pass on the merged tree had 4090 passing, 3 failing and 45 skipped tests; both CMS router-context failures and the rendering budget were corrected, and their 13-test suite passed. Health's 58 targeted tests passed after the missing capability repair; the other 13 review/config/router tests passed in the initial affected run. The initial Node pass had 333 passing and one formatting-only W6 failure; its four tests passed after correction. The final complete Node run passed 334/334; the final PDF/CMS rerun passed 13/13. Every registered source gate passed across ordered segments, including the final 54 notification tests. No database/provider/browser or deployment acceptance was performed.

No migration SQL or Prisma schema changes are made relative to current main. No new section-24 feature work, migration application, live provider call or deployment is included. Runtime acceptance remains deferred after section 28.
