# Local development

Use Node.js 22.16.0 and npm 10.9.x. From the repository root, run `npm ci`, then `npm run dev` for Web on port3000 and `npm run dev:admin` for Admin on port3001. These commands use the workspace Vite configurations. Build packages with `npm run build` when needed by the native API runtime.

Application configuration belongs in the selected app environment or an explicitly configured process environment. The [environment inventory](ENVIRONMENT_INVENTORY.md) records names and source contracts; `.env.runtime.example` contains placeholders only and is not automatically loaded. Configure only required capabilities. Browser `VITE_*` values are public.

For an independent API use the scripts in `apps/api/package.json` and an explicitly selected port/origin. Enable backend services only with isolated database/Redis targets and the existing provisioning and safety guards. Local startup is not production acceptance. Proxy hops are explicit; authentication cookies remain HttpOnly and SameSite=Strict, with Secure required for staging/production.

Google AI Studio execution, iframe compatibility and its CI job were retired by the project owner on2026-10-19. Old Studio documentation and evidence describe historical runs only and are not startup, deployment or secret-management instructions. Do not use old Studio launchers, flags, cloud socket defaults or Nginx bridge utilities. CI and deployment no longer depend on that platform.

The owner reaffirmed this retirement on2026-10-21. Active UI messages, dry-run statuses and bootstrap attribution now refer to an approved runtime rather than a hosting provider. Imported-course report contract v3 emits `CODE_COMPLETE_READY_FOR_RUNTIME_INTEGRATION`, `DEFERRED_TO_APPROVED_RUNTIME` and `RUNTIME_VERIFIED`; the last state still requires every source/database/backup/browser/smoke gate with matching source evidence. Legacy university bulk promotion remains rejected with `UNIVERSITY_BULK_IMPORT_BLOCKED_PENDING_RUNTIME_APPROVAL` until its existing safety/recovery/approval conditions are satisfied.

Historical migration SQL and evidence are retained byte-for-byte. Their old provider names identify the original review window; they do not require access to that service. Use the current generic mutation/recovery gates for any future authorized operation. Reading historical marker text in a source verifier does not provision infrastructure, approve a migration or demonstrate runtime success.

The abandoned Vercel project must not be automatically deployed by the source-consolidation merge. `vercel.json` disables Git deployment for both `main` and the repair branch while retaining the SPA rewrite. This does not deploy or enable another provider; hosting remains a separate authorized step.
