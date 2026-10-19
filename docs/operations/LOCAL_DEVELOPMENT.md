# Local development

Use Node.js 22.16.0 and npm 10.9.x. From the repository root, run `npm ci`, then `npm run dev` for Web on port3000 and `npm run dev:admin` for Admin on port3001. These commands use the workspace Vite configurations. Build packages with `npm run build` when needed by the native API runtime.

Application configuration belongs in the selected app environment or an explicitly configured process environment. The [environment inventory](ENVIRONMENT_INVENTORY.md) records names and source contracts; `.env.runtime.example` contains placeholders only and is not automatically loaded. Configure only required capabilities. Browser `VITE_*` values are public.

For an independent API use the scripts in `apps/api/package.json` and an explicitly selected port/origin. Enable backend services only with isolated database/Redis targets and the existing provisioning and safety guards. Local startup is not production acceptance. Proxy hops are explicit; authentication cookies remain HttpOnly and SameSite=Strict, with Secure required for staging/production.

Google AI Studio execution, iframe compatibility and its CI job were retired by the project owner on2026-10-19. Old Studio documentation and evidence describe historical runs only and are not startup, deployment or secret-management instructions. Do not use old Studio launchers, flags, cloud socket defaults or Nginx bridge utilities. CI and deployment no longer depend on that platform.
