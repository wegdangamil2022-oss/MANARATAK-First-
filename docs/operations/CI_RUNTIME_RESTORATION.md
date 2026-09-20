# CI runtime restoration

The full source CI covers more than remediation:verify. Keep both gates enabled.

- The imported-course source job uses the existing Prisma source gate. It supplies non-routable-to-production validation configuration for both datasource variables and runs only validate/generate, never migration or SQL.
- Translation CI builds application and its transitive project references (including domain/shared/core) before running Vitest, including on a clean checkout. The locale contract imports application at runtime; building only domain/shared is insufficient.
- PreviewDatabaseProbe delegates Prisma construction/metadata to the existing RuntimeResourceRegistry authority. It imports that authority only after the explicit Preview gate and URL checks. The client remains isolated, bounded, and disconnected in finally; no Redis client is instantiated by these factory functions.
- `scripts/verify-vercel-api-handler.mjs` is explicitly classified as source/runtime-verification tooling in operational-tooling-boundary.json. It imports Prisma only to check the constructor, never creates that client, rejects external network/periodic workers, and injects a mock database. This classification grants no permission to mutate a database.
- University major navigation uses the canonical majorLinks entries directly. Unlinked topKeyMajors labels remain non-interactive; display-name equality never determines an ID.
- CodeQL init/analyze share one immutable revision and are grouped for Dependabot. Branch validation allows only the configured Dependabot ecosystem namespaces, not arbitrary names.
- GitHub dependency graph/alerts must be enabled for dependency-review; do not skip the security job when repository configuration is missing.

These changes neither configure Vercel credentials nor provision Supabase. Historical failed Actions runs stay failed; verify the runs for the new commit separately.
