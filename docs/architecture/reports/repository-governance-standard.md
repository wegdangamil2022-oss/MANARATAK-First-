# Repository Governance Standard & Cleanup Audit

## 1. Executive Summary
This document establishes the official Repository Governance Standard for the MANARATAK monorepo. As the codebase scales, maintaining repository hygiene is paramount for developer productivity, CI/CD performance, and architectural clarity. This standard defines strict file and directory categorizations, lifecycle statuses, and rules for what is permitted within the version control system. Furthermore, it treats the repository structure as a governed architectural asset by establishing clear repository ownership and modification approval policies. An automated scan of the repository was conducted to assess compliance and generate a targeted cleanup plan.

## 2. Repository Governance Standard

Every file and directory committed to the MANARATAK repository must be strictly classified into one of the following official categories and assigned a lifecycle status.

### 2.1 File & Directory Classifications

| Category | Definition | Version Control Rule |
| :--- | :--- | :--- |
| **Source** | Primary application code, domain logic, and infrastructure adapters (`.ts`, `.tsx`, `.css`). | **Must be committed.** |
| **Configuration** | Environment templates, CI/CD pipelines, bundler configs, and static settings (`.env.example`, `.json`, `.yaml`). | **Must be committed.** |
| **Documentation** | Markdown files, architectural decision records (ADRs), and developer guides (`.md`, `.txt`). | **Must be committed.** |
| **Test** | Unit, integration, and e2e test suites (`.test.ts`, `__tests__`). | **Must be committed.** |
| **Script** | Utility scripts for local development, migrations, or builds (`.sh`, `.py`). | **Must be committed.** (If actively used) |
| **Asset** | Static images, fonts, or icons required for the application (`.png`, `.svg`). | **Must be committed.** (Optimize before commit) |
| **Generated** | Lockfiles ensuring deterministic dependency resolution (`package-lock.json`, `yarn.lock`). | **Must be committed.** |
| **Build Artifact** | Compiled output, bundled assets, or sourcemaps (`dist/`, `build/`, `.next/`). | **STRICTLY FORBIDDEN.** |
| **Temporary** | Ephemeral files, logs, or editor swaps (`.log`, `.tmp`, `.DS_Store`). | **STRICTLY FORBIDDEN.** |
| **Experimental** | Proofs-of-concept or prototypes not yet approved for production. | **Allowed (with `@experimental` tag/doc).** |
| **Legacy** | Deprecated source code or old migrations no longer actively executed. | **Candidate for Removal.** |

### 2.2 Lifecycle Statuses

Every artifact discovered in an audit must be assigned one of the following statuses to govern its future within the monorepo:

*   **Official:** Actively maintained, essential for building, running, or understanding the application.
*   **Experimental:** Subject to change or removal. Expected to mature into `Official` or be discarded.
*   **Temporary:** Allowed only locally. Must be excluded via `.gitignore`.
*   **Deprecated:** No longer used but retained temporarily for backward compatibility or reference.
*   **Candidate for Removal:** Artifacts that violate governance standards (e.g., committed `dist/` folders, orphaned files, unused scripts) and are scheduled for immediate deletion.

## 3. Repository Ownership & Architecture Matrix

To treat the repository structure as a governed architectural asset, strict ownership and modification rules are enforced at the top-level directory level.

### 3.1 Repository Ownership Matrix

| Directory | Architectural Owner | Responsibility | Allowed Modifications | Protected Assets |
| :--- | :--- | :--- | :--- | :--- |
| `apps/` | Application Teams | Entry points, composition, and presentation layer of deployable services. | Addition of new apps; modification of existing app code. | Cross-app routing configs, unified build scripts. |
| `packages/` | Platform Engineering | Shared domain logic, application services, and infrastructure adapters. | Iterative enhancements, bug fixes, adding new internal packages. | Domain models, core package APIs, public interfaces. |
| `docs/` | Architecture Review Board (ARB) | Architectural decision records (ADRs), governance standards, and documentation. | Proposing new standards, updating technical docs. | Official Architecture Reports, Governance Standards. |
| `scripts/` (or `tools/`) | DevOps / Platform Team | CI/CD pipelines, build tools, migration scripts, and repository utilities. | Adding/updating automation scripts. | Core deployment scripts, CI pipeline definitions. |
| `.github/` (or CI dir) | DevOps / Platform Team | CI/CD workflow orchestration and repository configuration. | CI/CD enhancements, security scanning updates. | Main branch protection rules, production deployment workflows. |

### 3.2 Change Approval Rules

Any structural or lifecycle modification to the repository requires explicit authorization based on the impact radius:

*   **File Deletion:** Requires approval from the direct Code Owner of the affected module. A clear justification (e.g., deprecated, migrated) must be provided in the Pull Request.
*   **Directory Removal:** Requires approval from the Architectural Owner of the top-level domain (e.g., Platform Engineering for a `packages/` removal) and must be accompanied by an impact analysis confirming no downstream dependencies are broken.
*   **Package Restructuring:** (e.g., moving, merging, or splitting packages) Requires formal review and approval from the Architecture Review Board (ARB) to ensure alignment with domain-driven design principles.
*   **Generated Artifacts:** Changes to generated files (e.g., `package-lock.json`, generated GraphQL schemas) are implicitly approved if the underlying source change is approved, provided they pass CI deterministic checks. Manual edits to generated artifacts are strictly forbidden.
*   **Build Outputs:** Committing build outputs (e.g., `dist/`, `build/`) is strictly forbidden. Any PR attempting to bypass this rule will be automatically rejected by CI pre-flight checks. No exceptions or approvals are permitted.

## 4. Repository Inventory & Audit Report

An automated scan of the entire MANARATAK workspace (excluding `node_modules` and `.git`) was conducted to baseline the current state of repository hygiene.

### 4.1 Global Artifact Inventory
*   **Source:** 736 files
*   **Configuration:** 39 files
*   **Test:** 23 files
*   **Script:** 196 files
*   **Documentation:** 268 files
*   **Build Artifacts:** 1,948 files
*   **Temporary/Empty:** 0 files
*   **Generated:** 0 files (Requires validation if lockfiles are missing)
*   **Asset/Legacy:** 0 files

### 4.2 Audit Findings & Classifications

**Finding 1: Severe Build Artifact Contamination**
*   **Detection:** 1,948 files located within `dist/` directories (e.g., `packages/domain/dist/index.d.ts.map`, `packages/domain/dist/index.js`).
*   **Status:** **Candidate for Removal**
*   **Analysis:** Build artifacts are polluting the workspace. Committing or retaining `dist/` folders in the repository bloats Git history, causes merge conflicts on compiled output, and slows down IDE indexing.

**Finding 2: High Volume of Scripts**
*   **Detection:** 196 scripts identified.
*   **Status:** **Experimental / Candidate for Removal**
*   **Analysis:** A disproportionately high number of utility scripts relative to the source size suggests many may be unused, orphaned, or one-off temporary files left behind.

**Finding 3: Clean Temporary/Empty States**
*   **Detection:** No `.log`, `.tmp`, or empty directories detected in the tracked tree.
*   **Status:** **Official** (Compliance Confirmed)
*   **Analysis:** `.gitignore` rules for standard temporary files appear effective.

## 5. Cleanup Plan & Migration Strategy

To enforce the Repository Governance Standard, the following cleanup plan will be executed. **No files have been deleted during this audit phase.**

### 5.1 Phase 1: Build Artifact Eradication (Immediate)
**Goal:** Remove all 1,948 `dist/` files from version control and the local workspace.
**Action Items:**
1.  Verify `.gitignore` contains strict rules for `dist/`, `build/`, `.tscache`, and `.out/` at both the monorepo root and package levels.
2.  Execute `git rm -r --cached packages/*/dist` and `apps/*/dist` to untrack the compiled output without deleting local copies if needed for running processes.
3.  Add an automated CI check (`git diff --exit-code` post-build) to ensure build steps do not result in uncommitted changes to tracked files.

### 5.2 Phase 2: Script Consolidation (Iterative)
**Goal:** Audit the 196 script files to identify unused or orphaned utilities.
**Action Items:**
1.  Map all `.sh`, `.py`, and `.bat` files to known CI/CD pipelines, package.json scripts, or documented developer workflows.
2.  Mark unmapped scripts as **Candidate for Removal**.
3.  Move retained scripts to a centralized `tools/` or `scripts/` directory with an accompanying `README.md` defining their purpose.

### 5.3 Phase 3: Lockfile Validation
**Goal:** Ensure deterministic builds.
**Action Items:**
1.  Investigate the absence of standard lockfiles (`package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`) in the audit scan.
2.  Generate and commit the official package manager lockfile to the repository root.

### 5.4 Removal Impact Analysis
*   **Build Artifacts (`dist/`):** **NO IMPACT** on source integrity. CI pipelines naturally rebuild these directories. Removing them reduces clone times and search index bloat.
*   **Unused Scripts:** **LOW IMPACT**. Removing unmapped scripts streamlines the onboarding experience and reduces maintenance burden.
*   **Temporary Files:** **NO IMPACT**. These are ephemeral and explicitly meant to be ignored.

## 6. Ongoing Governance Enforcement
Moving forward, repository hygiene will be enforced via pre-commit hooks (e.g., Husky + lint-staged) and CI pipeline checks. Any PR introducing forbidden categories (like Build Artifacts or Temporary files) will be automatically rejected.
