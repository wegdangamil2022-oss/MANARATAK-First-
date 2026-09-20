# Script Organization Standard

## Document Information

- **Title:** Script Organization Standard
- **Document ID:** STD-OPS-001
- **Status:** Baseline
- **Owner:** Architecture Review Board (ARB)

## Applies To

- All Project Phases
- Repository Scripts
- Build Scripts
- Development Scripts
- Testing Scripts
- CI/CD Scripts
- Deployment Scripts
- Database Scripts
- Maintenance Scripts
- Migration Scripts
- Utility Scripts

---

## 1. Purpose

The purpose of the Script Organization Standard is to establish a rigorous, enterprise-wide framework governing all executable scripts used throughout the MANARATAK 2.0 repository. This standard ensures consistency, discoverability, maintainability, execution safety, and robust automation across the entire software development lifecycle (SDLC).

## 2. Scope

This standard applies to all executable scripts maintained within the MANARATAK 2.0 monorepo. This includes, but is not limited to, Bash/Shell scripts, Node.js (`.js`, `.ts`) scripts, PowerShell scripts, and Python utilities utilized for local development, CI/CD automation, database migrations, and operational maintenance.

## 3. Objectives

- **Consistency:** Standardize script location, naming, and invocation methods.
- **Discoverability:** Ensure developers and automation platforms can easily locate necessary scripts.
- **Safety:** Prevent destructive operations in production and standardize error handling and exit codes.
- **Maintainability:** Enforce clean, documented, and modular script development.
- **Security:** Ensure scripts securely handle secrets and environment variables without hardcoding credentials.

## 4. Script Categories

All scripts must be classified into one of the following official categories:

- **Build:** Scripts orchestrating the compilation, bundling, and packaging of applications and libraries.
- **Development:** Scripts facilitating local environment setup, local server execution, and developer tooling.
- **Testing:** Scripts for executing unit, integration, E2E, and performance tests, including environment scaffolding.
- **Linting:** Scripts enforcing code quality, static analysis, and styling rules.
- **Formatting:** Scripts orchestrating code formatters (e.g., Prettier).
- **Database:** Scripts for database initialization, seeding, and resetting.
- **Migration:** Scripts managing schema and data migrations across environments.
- **CI/CD:** Automation scripts specific to Continuous Integration and Continuous Deployment pipelines.
- **Deployment:** Scripts managing the provisioning and release of artifacts to target environments.
- **Maintenance:** Scripts for health checks, cache clearing, and routine system upkeep.
- **Backup:** Scripts for creating system, data, or configuration backups.
- **Restore:** Scripts for restoring from backups.
- **Utilities:** General-purpose helper scripts supporting other automation tasks.

## 5. Official Directory Structure

Scripts must be organized into specific directories based on their scope and category. Ad hoc scripts scattered throughout the repository are strictly prohibited.

```text
/
├── scripts/                    # Monorepo-level global scripts
│   ├── ci/                     # CI/CD pipeline automation
│   ├── db/                     # Global database operations (seeds, resets)
│   ├── dev/                    # Global local development setup
│   ├── deploy/                 # Global deployment orchestration
│   └── utils/                  # Global helper scripts
├── apps/
│   └── [app-name]/
│       └── scripts/            # Application-specific scripts
│           ├── build/
│           ├── deploy/
│           └── test/
└── packages/
    └── [package-name]/
        └── scripts/            # Package-specific scripts (if necessary)
```

## 6. Naming Standard

All scripts must adhere to the following naming conventions to ensure cross-platform compatibility and clarity.

- **Shell Scripts:** Must use `kebab-case` with a `.sh` extension (e.g., `setup-env.sh`).
- **Node Scripts:** Must use `kebab-case` with `.js` or `.ts` extensions (e.g., `seed-database.ts`).
- **PowerShell Scripts:** Must use `kebab-case` with a `.ps1` extension (e.g., `install-tools.ps1`).
- **Python Scripts:** Must use `snake_case` with a `.py` extension (e.g., `process_data.py`).
- **Utility Scripts:** Must follow the naming convention of their respective language.

_Note: Executable scripts intended to be run directly via the command line should omit the extension if they include a proper shebang (e.g., `#!/usr/bin/env bash`), though retaining the extension is preferred for clarity in a cross-platform repository._

## 7. Repository Integration

### `package.json` Integration

All commonly used scripts must be exposed as `npm` or `pnpm` scripts within the relevant `package.json` file.

- Global operations belong in the root `package.json`.
- App-specific operations belong in the app's `package.json`.
- Scripts must be composed using lifecycle hooks (e.g., `prebuild`, `build`, `postbuild`) where appropriate.

### Workspaces

Monorepo-wide scripts must utilize workspace-aware commands (e.g., `npm run build --workspaces`) to execute tasks across all apps and packages efficiently.

### CI/CD Pipelines

Pipeline configurations (e.g., GitHub Actions, GitLab CI) must invoke scripts via the package manager (`npm run <script-name>`) or by executing files located strictly in the `/scripts/ci/` directory.

### Git Hooks

Git hooks (e.g., via Husky) must reference defined `package.json` scripts rather than containing inline logic.

### Docker and Dev Containers

Dockerfile `RUN` instructions and Dev Container lifecycle hooks must reference scripts located in the official directory structure.

## 8. Execution Rules

- **Required Permissions:** Shell scripts must be committed with executable permissions (`chmod +x`).
- **Environment Requirements:** Scripts must explicitly validate the presence of required environment variables before execution.
- **Logging Expectations:** Scripts must provide clear, structured logging to standard output (`stdout`). Error messages must be directed to standard error (`stderr`).
- **Error Handling:** Scripts must use strict error handling. Bash scripts must include `set -euo pipefail`.
- **Exit Codes:** Scripts must exit with `0` on success and a non-zero integer (e.g., `1`) on failure. Custom error codes must be documented if utilized.

## 9. Security Rules

- **Secrets:** Under no circumstances shall passwords, API keys, or tokens be hardcoded into scripts.
- **Credentials:** Authentication must rely on environment variables, injected secrets, or identity providers (e.g., AWS IAM, GCP Workload Identity).
- **Environment Variables:** Scripts must load sensitive environment variables securely (e.g., via `.env` files that are strictly `.gitignore`'d).
- **Production Safety:** Scripts targeting production environments must require explicit confirmation flags (e.g., `--confirm` or `--force`) to prevent accidental execution.
- **Destructive Operations:** Scripts that delete data, drop tables, or destroy infrastructure must implement a "dry-run" mode by default and require explicit flags to execute destructively.

## 10. Governance Rules

- All new scripts must be reviewed and approved during the Pull Request process.
- Scripts bypassing the official directory structure will block PR merges.
- The Architecture Review Board (ARB) retains the right to audit and deprecate non-compliant scripts.

## 11. Maintenance Process

- Scripts must be reviewed quarterly by the DevOps architecture team for relevance and security.
- Outdated or unused scripts must be formally deprecated and removed.
- Third-party CLI tools invoked by scripts must have their versions pinned and regularly updated.

## 12. Compliance Checklist

Before merging a new script, ensure:

- [ ] Script is placed in the correct directory (e.g., `/scripts/`, `apps/[app-name]/scripts/`).
- [ ] File name strictly follows the naming standard.
- [ ] Execution permissions are correctly set in Git.
- [ ] Bash scripts include `set -euo pipefail`.
- [ ] Script handles errors gracefully and returns correct exit codes.
- [ ] No hardcoded secrets or credentials exist in the script.
- [ ] Destructive scripts require explicit confirmation.
- [ ] The script is documented or exposed in the relevant `package.json`.

## 13. Examples

### Compliant Examples

- **File Path:** `/scripts/database/seed-orchestrator.mjs`
- **File Path:** `/apps/api/scripts/deploy/release.sh`
- **package.json:** `"db:seed": "node scripts/database/seed-orchestrator.mjs apply"`
- **Bash Script Header:**
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail

  if [ -z "${DATABASE_URL:-}" ]; then
    echo "Error: DATABASE_URL is not set." >&2
    exit 1
  fi
  ```

### Non-Compliant Examples

- **File Path:** `/utils/MyScript.sh` _(Violation: Incorrect directory, PascalCase naming)_
- **File Path:** `/apps/web/do_deploy.js` _(Violation: Script in root of app, snake_case naming)_
- **Hardcoded Secret:** `API_KEY="sk_live_12345"` _(Violation: Secret committed to repository)_
- **Missing Error Handling (Bash):** Missing `set -e`, allowing script to continue after a failure.

## 14. Glossary

- **ARB:** Architecture Review Board.
- **SDLC:** Software Development Life Cycle.
- **CI/CD:** Continuous Integration / Continuous Deployment.
- **Shebang:** The character sequence `#!` at the beginning of a script, denoting the interpreter.

## 15. References

- [Documentation Lifecycle Policy (DOC-GOV-001)](./doc-gov-001-documentation-lifecycle-policy.md)
- [Documentation Naming Standard (DOC-GOV-003)](./doc-gov-003-documentation-naming-standard.md)
- [Enterprise Documentation Index (DOC-GOV-002)](./doc-gov-002-enterprise-documentation-index.md)
- DevOps Architecture Master Plan
- Testing Strategy and Automation Guidelines
