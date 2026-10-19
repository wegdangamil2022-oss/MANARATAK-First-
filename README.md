# Neutral educational platform — ABSHEER source handoff

This is an independent, data-cleared **source-only** handoff based on MANARATAK-First-. The original main branch is unchanged.

- `apps/web`: public website; `apps/admin`: admin dashboard; `apps/api`: API.
- `packages`: domain, application, persistence and database schema. Admin and catalog modules stay available.
- `scripts`: generic data import, quality and build tools; owner-specific one-offs were excluded.
- Reference catalogs are deliberately empty. No source datasets, sample academic records, payment credentials, or live database are included.

For development: Node 22.16.0 / npm 10.9, `npm ci`, `npm run dev`, `npm run dev:admin`.
All credentials must be generated afresh. See `ABSHEER_HANDOFF.md` for security and validation steps. This handoff is not certified production-ready.
