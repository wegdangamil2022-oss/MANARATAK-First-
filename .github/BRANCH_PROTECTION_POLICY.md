# MANARATAK `main` Branch Protection Policy

**Status:** REQUIRED EXTERNAL REPOSITORY CONFIGURATION  
**Finding:** `MNT-AUD-0005`  
**Source date:** 2026-09-06

This file defines the repository setting that must be enforced on the actual GitHub `main` branch. It does not claim that branch protection is enabled merely because this file exists.

## Initial protection set

Enable branch protection/ruleset for `main` with:

- pull request (or equivalent controlled merge) required before merge;
- at least one approving review for normal changes;
- dismissal/re-review when protected-code changes invalidate an approval;
- force pushes disabled;
- branch deletion disabled;
- conversation resolution required where supported;
- required status checks must be up to date before merge.

Use only status checks that actually exist and have been observed on the target repository. The initial source-defined candidates are:

- `Full source closure gates` from `.github/workflows/ci.yml`;
- `Translation quality gates` from `.github/workflows/ci.yml`;
- `Deployment configuration` from `.github/workflows/ci.yml`;
- `architecture-guards` / the Source Architecture Guards workflow;
- `secret-scan` from the Security Gates workflow.

Do not invent required-check names. Do not disable branch protection to bypass a broken verifier. `MNT-AUD-0048` owns expansion/correction of the full verifier set before final production handoff.

## Emergency recovery

Repository-owner emergency recovery must remain possible through an explicit audited bypass/ruleset exception, not by leaving `main` generally unprotected. Any bypass should be time-bounded and followed by normal CI/review reconciliation.

## Closure evidence

`MNT-AUD-0005` remains `BLOCKED_EXTERNAL` until evidence from the real repository shows:

- `main` protected/ruleset active;
- required checks configured with exact existing contexts;
- force-push/delete protection active;
- controlled merge/review policy active.
