# Official repository adoption — 2026-09-13

The source of truth is `wegdangamil2022-oss/Manaratal-Final`, branch `main`.
`wegdangamil2022-oss/MANARATAK_FINAL` remains unchanged as a historical reference.

## Provenance

- Source repair branch: `fix/vercel-typescript-config-context`, commit `818de64b3c9b26056070812865659a84bbf61819`.
- Earlier remediation closure `600b28df824f207642aa6105e37256d3a6950666` is already an ancestor.
- The full source and Google AI Studio isolation were transferred in `7fd03c000213c8745c542dbe6492e8233bd7d5f3`.
- Subsequent target commit `8610aad71b76a62cd3928ef75b26085ad070c72b` replaced the monorepo with a frontend-only design snapshot, deleting 2,884 baseline files.
- This restoration retains that commit in history and preserves its UI work. Deleted backend, workspaces, tests, CI, documentation and datasets are restored from `7fd03c0`.
- The frontend-only root entry/config and fetch-mocking preview adapter are removed: they are not the real API. Their original contents remain recoverable from `8610aad`.
- The complete workspace manifests and domain operational exports are restored. Admin routing uses Vite's configured base rather than a hardcoded design-sandbox path.
- Integration fixes cover optional university/major fields, accessible filter and major controls, dark-theme text contrast, and CSP-compatible typography. Prototype mode retains its visible non-production label; canonical security guards are not weakened.

## Development and deployment boundaries

`npm ci` then `npm run dev` starts Google AI Studio-compatible Public Web on port 3000.
`npm run dev:admin` starts the separate Admin application on port 3001.
Configure `VITE_API_URL` only when a real HTTP API is available. The default frontend preview does not start API, workers or database connections and never installs a fake API adapter.

Repository adoption is not database provisioning or production readiness. Existing Vercel project links, secrets and Supabase data are not copied by Git. No migration, seed, SQL or secret change is part of this operation.
Automatic release-promotion and recovery-restore workflows retain their old repository guards and therefore remain disabled here until separately authorized and configured. Source CI remains enabled.

Preserve the full monorepo when exporting Google AI Studio changes. Do not replace the repository with a frontend-only export. The compatibility tests assert the presence of runtime workspaces, configuration and regression guards.

## Verification scope

Local checks include root/API typecheck, API/Web/Admin builds, Google AI Studio startup/build isolation, native API handler/workspace resolution, Vercel-equivalent TypeScript contexts, 81 selected unit tests, all 17 remediation verifiers and secret scanning. Database tests use mocks; no live database operation is performed. A successful local build is not evidence of a new Vercel deployment or configured external services.

Restored historical files are kept byte-for-byte, including pre-existing whitespace in documentation and source archives. Formatting-only cleanup of those files is outside this restoration.
