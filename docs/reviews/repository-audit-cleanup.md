# Repository audit and cleanup — 2026-10-11

Base: `40519a333607aa66bed0716cb5848de3242b4a5c`, the merge of section 19 / PR #20.

## Audit corrections

The standalone Admin audit inventory had 89 stale findings: 34 new routes and 55 changed contracts across Academic Taxonomy, AI Admin/Gateway, CMS, Courses, International Tests, Majors and Reference Data. Their mounted permissions, parsers and owner routing were reviewed against the source and 175 router/governance tests in 16 files.

AI and CMS use request-dependent permission resolvers in router-wide middleware. The inventory extractor now records the candidate permission set and a fingerprint of the resolver and its evaluator middleware, only for routes mounted after that middleware. Candidate sets are conditional evidence; they do not mean every candidate is required for every request. Unused resolvers, unrelated evaluators and later middleware cannot supply this evidence. A changed policy requires a new inventory review, even if its permission literals remain unchanged.

The review also found a real audit exemption defect. Reference Data `POST /owner-imports/preview` and Academic Taxonomy `POST /imports/preview` persist review plans through their owner gateways. The generic `/preview` suffix exemption incorrectly suppressed their required HTTP audit. Exemptions now cover only the reviewed non-writing POST routes. Persisted previews, unknown previews and other mutation methods require audit. Trailing slashes and query parameters are covered by regression tests.

Student-tool Admin tests are recorded as owner-encrypted execution replay, rather than generic plaintext response caching. The inventory retains the existing owner-atomicity verification requirements and the documented import-route collision; this review does not certify those runtime properties.

## Removed obsolete files

- `bun.lock`: competing root lockfile; npm's `package-lock.json` is canonical and the historical Bun archive already exists.
- `cookies.txt`: browser-session output with no project references.
- `fix_icons.sh`, `fix_fellowship_icons.sh`: one-off source-edit scripts with no active callers.
- `sec16_original.txt`, `subcard_debug.txt`: unused UI scratch copies.
- `server.ts`: unreferenced static-server copy superseded by the `npm start` entry point, `server.js`.
- `src/assets/images/manaratak_poster_1789097115534.jpg`: unreferenced root asset. The active public poster remains in the Web application.

The repository organization verifier now recognizes the current workspace configuration, generated build directories and documented evidence logs. It still rejects stray session files, competing or missing lockfiles, temporary files, broken imports and broken documentation links. Side-effect imports are checked as well as named and dynamic imports. Scratch session/debug files are ignored to prevent accidental staging.

## Validation and ongoing enforcement

- Admin inventory: PASS, 379 handlers / 378 distinct endpoints.
- Repository organization: PASS; no unexpected root entries, temporary artifacts, competing lockfiles, broken relative imports or broken important links.
- Router/governance review: 175 tests in 16 files passed.
- Policy and related owner/audit regression: 31 tests in 4 files passed.
- Inventory/security contracts: 13 Node tests passed; organization contracts: 4 Node tests passed.
- TypeScript, changed-file ESLint and `npm run ci:source:contracts`: passed on Node 22.16.0.

Both Admin inventory and repository organization are now registered blocking source-closure gates. Full build/test results and final GitHub checks are established separately at the PR head. No database operations or deployment are part of this cleanup.
