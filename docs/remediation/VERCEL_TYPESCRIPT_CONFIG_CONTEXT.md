# Vercel TypeScript configuration context

Baseline: `8ead20822559464c7fae701bf9a29cdb17bdcc2b` (main).
Local validation: Node 22.16.0, TypeScript 5.8.3.

## Cause and discovery

The Vercel Node builder registers its TypeScript loader with the entrypoint as
`project`, `files: true`, and the deployment Node major. For
`apps/api/src/server.ts`, TypeScript's actual `findConfigFile` result is
`apps/api/tsconfig.json`. The root solution config is a separate fallback context,
not the config selected for that entrypoint. One loader is reused for traced files.

The loader reads raw JSON, applies `fixConfig`, then resolves `extends` with
`parseJsonConfigFileContent`. A missing raw `module` therefore causes NodeNext
module/resolution and strict=false to override the intended inherited settings.
The target and interop defaults are also applied before inheritance.

Source model: [Vercel TypeScript loader](https://github.com/vercel/vercel/blob/3c3fe0de8b5ee17992735fd5560f753387455538/packages/node/src/typescript.ts)
and [builder registration](https://github.com/vercel/vercel/blob/main/packages/node/src/build.ts).
These are local loader-equivalent results; the connected Vercel account returned
no projects, so this report does not claim inspection or success of a remote deployment.

## Measured effective settings

| Context | State | target | module | moduleResolution | strict | strictNullChecks | esModuleInterop | jsx |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API / Admin | Before | ES2021 | NodeNext | NodeNext | false | false | true | react-jsx |
| API / Admin | After | ES2022 | ESNext | Bundler | true | true | false | react-jsx |
| Root solution | Before | ES2021 | NodeNext | NodeNext | false | false | true | unset |
| Root solution | After | ES2022 | ESNext | Bundler | true | true | false | unset |
| Web | Before | ESNext | ESNext | Node10 | true | true | false | react-jsx |
| Web | After | ESNext | ESNext | Bundler | true | true | false | react-jsx |

API, Admin and root now explicitly pin the five mutable options. Interop=false
preserves normal repository semantics; Bundler still allows synthetic default
imports. Web already pinned the other options, but its legacy Node resolution
could not resolve the React/Tailwind Vite plugin declarations when its Vite config
was checked. Changing that option to Bundler resolves those diagnostics.

No business source, JSON normalization logic, import.meta usage, Vite imports,
strictness flags, or library-check settings were changed.

## Regression and results

`npm run vercel:typecheck` checks explicit options, actual API config discovery,
and semantic/syntactic compilation without project-reference redirection. It
checks the reported frontend/Vite files under the shared API context as well as
their workspace contexts, and checks the root fallback. The only excluded codes
are Vercel's own built-in 6059, 18002 and 18003, with their count printed; no
reported type/module error is excluded. It does not emit or execute application code.
The regular CI workflow runs this guard after its normal project typecheck.

To replay the original configuration against the unchanged source and base config:

```sh
node scripts/verify-vercel-typescript-context.mjs --diagnose --config-ref=8ead20822559464c7fae701bf9a29cdb17bdcc2b
```

This intentionally fails: API shared context 24, Admin 9, Web 2, root 6;
41 total diagnostics across contexts (some files are checked in multiple contexts).
It reproduces all three reported TS2322 locations, Admin/Web TS1470 locations,
and Vite defineConfig/Plugin TS2305. The corrected configuration reports zero
diagnostics in every context. SearchRouter and both Prisma files pass unchanged.

Validation results:

- `npm ci`: PASS, zero audit vulnerabilities.
- `npm run db:generate`: PASS (client generation only).
- `npx tsc -b --pretty false`: PASS, including after the Web resolution change.
- `npm run build -w @manaratak/api`: PASS.
- `npm run build -w @manaratak/admin`: PASS (bundle-size warning).
- `npm run build -w @manaratak/web`: PASS.
- `npm run lint`: PASS, zero errors; 2380 existing warnings.
- `npm run remediation:verify`: PASS, 17/17.
- `npm run vercel:typecheck`: PASS, zero diagnostics under TypeScript 5.8.3.

No migrations, seeds, database connections, or remote deployments were run.
