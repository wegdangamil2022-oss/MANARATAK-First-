# Public and student interface replacement — 2026-11-19

The owner supplied `manaratak22.zip` as the replacement design for the public website and student workspace. Its presentation components replace the corresponding components in `apps/web`; the repository remains the official MANARATAK First monorepo.

## Scope and boundaries

- Import the public pages, detail views, community channels, student navigation, expanded student sections, and responsive styles.
- Keep the existing API client, canonical routes, public data adapters, CSRF/session handling, authorization, CMS sanitization, authenticated certificate delivery, and course learning runtime.
- Retain published relationship navigation using canonical identifiers, including scholarship document requirements and international tests.
- Do not import the archive's placeholder shared packages, fake API responder, package lock, environment settings, AI Studio artifacts, or forced prototype configuration.
- No changes to the administration application, backend packages, database schema, migrations, credentials, or official database records are part of this replacement.

## Compatibility fixes

- Reconcile article and exam presentation with existing DTOs. Live article pages render the supplied published CMS body and relationships rather than substituting sample editorial records.
- Retain loading, empty, failure, retry, and partial-result states in the redesigned home sections.
- Reuse the existing locally hosted variable Cairo font subsets instead of shipping duplicate font families or loading Google Fonts.
- Replace inline styles with bounded percentage attributes and static styles compatible with the existing strict content security policy.
- Add keyboard interaction to clickable design elements and extract the shared country flag renderer to avoid a circular dependency.
- Use the existing upload-grant contract for profile images, including consent and error handling; an unsuccessful live upload never creates a synthetic saved asset.
- Keep preview data offline and explicit. Demo sign-in is distinct from live authentication, and the local prototype has a visible banner.

## Next integration stage

This is a design replacement and compatibility pass, not acceptance of every newly added student workflow as connected to production data. Newly introduced panels and actions must be reviewed section by section against the existing owner APIs before production acceptance. Existing bindings are preserved where compatible; the archive's illustrative content is not evidence of real offers, admissions, payments, qualifications, or student records.

## Validation

Run root TypeScript checks, the web production build, web unit/regression tests, the source architecture and accessibility gates, security source contracts, and Node source tests. Browser checks cover the guest view and all eight student tabs with isolated synthetic data on desktop and mobile. Live local checks use the existing official database and make no provisioning or migration changes.

The initial live public study-destinations read reported a database schema mismatch (`lastEditedBy` was missing from a related table). The subsequent [runtime repair](RUNTIME_REPAIR_20261119.md) applied the five pending immutable migrations to the existing official database, verified schema parity and preserved existing record counts. The live read now returns HTTP 200. This repair does not substitute sample records or complete the remaining student workflow integration.
