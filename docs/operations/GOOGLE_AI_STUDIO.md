# MANARATAK Google AI Studio workspace

This repository is **wegdangamil2022-oss/Manaratal-Final**, branch **main**.
Its initial functional baseline is the complete source tree of
MANARATAK_FINAL/fix/vercel-typescript-config-context at
818de64b3c9b26056070812865659a84bbf61819. The former repository must not be pushed or edited.
Manaratal-Final is now the official source repository; see [adoption record](OFFICIAL_REPOSITORY.md).
All apps, packages, data sets, tests and architecture documents are retained.

## Install and start

Use Node 22 (22.16+ recommended), and npm 10+. Engine ranges are advisory to avoid
rejecting compatible minor/patch versions of the AI Studio runtime.
The W0 source verifier recognizes this documented portable-install contract only
when the AI Studio verifier and environment template are present. Node 22.16.0
remains pinned in CI and .nvmrc; all other W0 assertions remain enforced.

```sh
npm ci
npm run dev
```

The root launcher starts Public Web at **0.0.0.0:3000**, automatically setting
MANARATAK_GOOGLE_AI_STUDIO=true and MANARATAK_RUNTIME_PROFILE=google-ai-studio.
No backend secrets are required. Installation generates the Prisma *client files*
only; it does not connect to PostgreSQL or run migrations.
The monorepo must be imported in full; keep the root package.json and package-lock.json.
Do not select apps/web as the installation root.

For the separate Admin UI:

```sh
npm run dev:admin
# To use the AI Studio preview port instead (stop Public Web first):
npm run dev:admin -- --port 3000
```

Admin defaults to port 3001, retains its login and API security contracts, and does
not grant access to administrative operations in Web-only mode.
To opt into the original local-development Web/API bridge, use npm run dev:full
only in a separately configured environment with the AI Studio flags absent.

## Environment and external data

Use .env.aistudio.local at the repository root (gitignored), or AI Studio's
environment/secret settings. The safe template is [.env.aistudio.example](../../.env.aistudio.example).
The complete names, requirements, classifications and source links are in
[GOOGLE_AI_STUDIO_ENVIRONMENT.md](GOOGLE_AI_STUDIO_ENVIRONMENT.md).

| Variable | Web preview |
|---|---|
| MANARATAK_GOOGLE_AI_STUDIO | Set automatically to true |
| MANARATAK_RUNTIME_PROFILE | Set automatically to google-ai-studio |
| VITE_API_URL | Optional; independent experimental API base, e.g. https://api.example.invalid/api/v1 |
| VITE_API_BASE_URL | Optional Admin API base, same format |
| VITE_PUBLIC_WEB_URL | Optional actual experimental Web origin for links |
| VITE_ADMIN_URL | Optional actual experimental Admin origin for links |
| DISABLE_HMR | Optional; false by default |

VITE_* values are public browser configuration. Never put database credentials,
JWT private keys, provider keys or other secrets in VITE_* variables.
Existing API clients use VITE_API_URL directly, with /api/v1 as the same-origin
default. No localhost API or original production endpoint is injected.
When no external API is configured, local /api requests return explicit HTTP 503
JSON and the UI shows unavailable/empty states and a connection notice.
No mock scholarships, financial data, authentication bypass or fallback DB is added.
API-backed business pages still require a separately configured API to return real data.
Preview-provisioning Vercel endpoints alone do not implement those business routes.

## Isolation and future Full Runtime

The Vite AI Studio branch never installs the Express bridge. It only serves the
Web or Admin frontend and an unavailable-response middleware for local /api routes.
API bootstrap and Preview database probes also reject the google-ai-studio profile,
even if original database credentials were accidentally present.
Frontend dependencies resolve domain/shared/types/ui source using Vite aliases.
Native Node API packages keep their dist entrypoints and project-reference build chain.

DATABASE_URL and DIRECT_URL must eventually belong to a **new, independent experimental
database**. No original secret is copied into this repository or automatically reused.
The profile guard blocks backend startup, rather than guessing database ownership
from a hostname. It cannot prove ownership of a URL supplied to a separate CLI process.
The existing mutation/provisioning gates remain in force.

Full Runtime is a separate later step: provision independent database and service
resources, inject the required server-only configuration listed in the inventory,
run the normal strict configuration/readiness checks, and obtain explicit approval
before migrations, seeds, imports or any database writes.
Run that backend separately from the google-ai-studio Web profile.
Do not simply remove security checks, enable workers or reuse the original database
to make an interface preview work. Redis/JWT/assets/finance/notifications are not
needed for starting this Web preview, but remain required by their Full Runtime contracts.

## CORS, iframe and HMR

Configure the external API's CORS_ORIGIN, PUBLIC_WEB_URL and ADMIN_WEB_URL with
the actual experimental origins. CanonicalApiCorsPolicy uses explicit origins;
do not use a permanent wildcard or disable cookies/CSRF validation.
AI Studio origins can change: update server configuration when the origin changes.
VITE_API_URL does not grant browser CORS permissions on the external API.

Only the AI Studio **development server** has iframe/HMR document headers:
Google-owned AI Studio/preview ancestor domains, Vite inline preamble/style support
and WebSocket connections. No temporary preview hostname is embedded.
The production build's _headers stays strict, including frame-ancestors 'none'
and X-Frame-Options DENY. An AI Studio-compatible build is therefore a production
bundle verification, not permission to embed production Admin in arbitrary sites.
HMR is enabled; only set DISABLE_HMR=true after diagnosing a specific proxy limitation.
If the Google proxy forwards a custom Host header rejected by Vite, set
__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS to that exact preview hostname in the
server environment; do not set allowedHosts=true. No secret is involved.

## Verification

```sh
npm run verify:aistudio
npm run build:aistudio
npm run build -w @manaratak/web
npm run build -w @manaratak/admin
npm run typecheck -w @manaratak/api
npm run build -w @manaratak/api
npm run typecheck
npm run vercel:typecheck
npm run runtime:verify -w @manaratak/api
node scripts/aistudio/environment.mjs --check
```

verify:aistudio starts the real root launcher with an isolated environment, checks
HTTP/HTML/Vite modules, tests unavailable local API responses, and rejects backend
module loads or external Node connections. Additional tests cover the profile
guard, security header separation, external URL configuration and Vite plugin selection.
Source-only workflows are preserved. Automatic release promotion and scheduled
restore operations are restricted to the original repository identity and cannot
run against this repository's unconfigured services.

Official Google import/environment instructions:
https://ai.google.dev/gemini-api/docs/aistudio-build-mode
https://ai.google.dev/gemini-api/docs/aistudio-fullstack

The user confirmed that the previous Google AI Studio import succeeded.
Local checks for this restored monorepo do not prove a new remote import or Vercel deployment.
Refresh/import the new commit in Studio after pushing; keep runtime deployment evidence separate.
