# P17 workflow execution plan migration recovery

`20261011150000_ai_workflow_execution_plan` is source only, owned by AI. It adds nullable requester identity and immutable execution-plan JSON to existing workflow runs. No database has been contacted or mutated.

After section 28, validate in a disposable database before rollout. Take a restorable backup and preserve run IDs, owner identities, budgets, prompt/model/routing fingerprints and execution/usage records. Verify expand compatibility: historical rows remain nullable and fail closed for execution rather than acquiring fabricated ownership.

If rollout fails, stop workflow admission, preserve provider and quota reconciliation evidence, and recover from the tested pre-change backup or use a separately reviewed forward fix. Dropping the fields would destroy authorization evidence and is not a safe rollback. Never automatically release UNKNOWN provider charges. Test migration, backup restore, conflicting workflow claims and retry binding stability in the disposable post-28 verification.
