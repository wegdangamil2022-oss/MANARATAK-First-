# Certificate administration workspace — 2026-10-27

Implemented on `feat/certificates-workspace-20261027`, from main
`b9e9adf0feec24716f8907a371d90488ed35a598`. This delivery is local; it does not
merge or push main.

## User-visible changes

- Five URL-addressable workspaces: registry, templates, issuers, reviews, and
  readiness/verification. Cairo typography, navy/teal/gold colors, controls,
  spacing, and panels reuse the Reference Data design conventions.
- Registry search, status/issuer/date filters, advanced owner and historical
  template-version lookup, bounded pagination, and preserved return filters.
  Unavailable analytics are identified as unavailable rather than zero.
- Template library, guided draft editor, immutable historical-version preview,
  searchable server-paged version history, and canonical review transitions.
  Copying an active template creates an independent draft with a new code;
  it does not alter the active root or existing course-version bindings.
- Issuer details, authority evidence, delegations, history, and existing
  independent approval/suspension commands remain permission-gated.
- Review worklists link to their canonical owner details. Certificate detail
  separates overview, protected files, lifecycle actions, and audit history.
  Renewal is available for eligible active or expired renewable certificates.
- Contextual reasons/confirmations, optimistic concurrency, duplicate-submit
  protection, stable idempotency identity after uncertain command results,
  unsaved-draft guards, independent read failures, and stale-response guards.
- Readiness and artifact recovery expose actual backend observations without
  claiming production issuance readiness or enabling external delivery.

## Read API decisions

The general Review Queue explicitly excludes certificate ownership. A small
read-only gateway projects existing certificate tables rather than persisting
another queue or duplicating approval commands.

`GET /admin/certificates/workspace` accepts `kind`, `page`, and `pageSize` only.
Kinds are templates, issuers, delegations, corrections, revalidation, and
recovery. Certificate view permission and the matching approval/management
permission are both required. Page size is at most 50. Rows expose only ID,
title, state, timestamp, and canonical detail path. Count and rows share a
repeatable-read transaction; missing storage returns 503 rather than a fake
empty list.

`GET /admin/certificates/templates/:id/versions` validates the template UUID,
bounded page/pageSize, and optional search (maximum 60 characters). It returns
only version ID/number/status/createdAt with an exact count, under certificate
view permission. Both reads use `Cache-Control: no-store`.

Two existing defects found during verification were corrected: bootstrap of a
new default draft no longer incorrectly requires an existing-template If-Match;
editing/transitions retain their preconditions. Official template preview uses
explicit preview serial/date placeholders because empty strings were rejected
by the text-layout validator. The official PDF/vector design is unchanged.

## Validation and evidence

- Certificate Vitest suite: **236 passed**, zero failed/skipped. The final two
  small UI changes also passed the targeted UI suite: **19 passed**.
- Full monorepo build and typecheck passed on Node 22.16.0. Admin production
  build passed. Existing large-bundle advisory remains; it is not a build error.
- Scoped ESLint: zero errors/warnings. Source quality: zero package/file cycles
  and zero accessibility findings. Certificate source closure: **94/94**.
- Source preflight passed, including **38/38** contract checks. DI reachability:
  443 reachable registrations, zero unreachable. Tracked-source secret scan and
  staged whitespace checks passed.
- Real PostgreSQL 16 verification ran only against the locally attested
  disposable database. Two synthetic identities used canonical login and MFA.
  Verified draft bootstrap, concurrency rejection, creator self-approval
  rejection, independent approval, all six projections, pagination bounds,
  historical-version search/count, and refusal of PDF delivery with an invalid
  synthetic signature. See [runtime proof](evidence/certificates-20261027/runtime-proof.json).
- Browser checks covered Arabic/English, desktop/tablet/mobile layouts, Cairo
  loading, registry/review/readiness/detail navigation, official previews,
  version history, and creating an independent draft through the actual form.
  The browser runner automatically resolved a leave-page confirmation, so a
  manual cancel/retain-unsaved-edits interaction is not claimed as verified.
- [Workspace screenshot](evidence/certificates-20261027/workspace.jpg) and
  [mobile screenshot](evidence/certificates-20261027/mobile.jpg) use synthetic
  data. Some full-page captures from the in-app renderer were incomplete;
  the attached viewport captures were inspected directly.

## Runtime scope and limits

Preview: `http://127.0.0.2:3170/admin/certificates`. It has a visible isolated
synthetic-data banner and is separate from the original app on port 3000.
The preview server, attestation, credentials, synthetic role assignments, and
test fixtures are private local verification tooling, not committed product
routes. No original accounts, MFA settings, database records, signing keys,
course bindings, or schema were changed. No migration or seed ran on the
original database, and no external delivery provider was enabled.

Production KMS/EAP issuance and complete signed-PDF delivery were not activated
or certified by this UI delivery. Existing canonical policy/issuance commands
remain the authority. Deployment against the original environment still needs
its ordinary authenticated review and existing production readiness gates.
