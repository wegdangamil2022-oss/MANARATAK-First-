# Safe Cleanup Policy

No cleanup is performed by this policy.

## Safe To Clean After Report

- Temporary logs that are not audit or import evidence
- Known build outputs and disposable Vite/Turbo caches
- Playwright reports and test-results directories
- Temporary runtime directories

## Requires Review

- npm cache
- Playwright browser cache
- Docker build cache, images, containers, and anonymous volumes
- Application logs that may contain operational evidence

## Never Delete Automatically

- PostgreSQL data or volumes
- Redis persistence or volumes
- Source files and source datasets
- Prisma schema and migrations
- `.git`
- Uploaded files, import evidence, backups, or recovery artifacts
