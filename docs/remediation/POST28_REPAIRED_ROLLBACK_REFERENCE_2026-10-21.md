# Repaired runtime — next scoped rollback reference

CI [39661105241](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/39661105241) completed all six jobs successfully on `8e001c92a97e0e2f865adce90fc4b3bc6d3b5514`. This includes full source/build/tests, the real financial and certificate worker replay cases, immutable artifact retrieval, restricted Linux runtime and its scoped browser workflows. The old rollback action was correctly blocked because its pinned previous artifact lacks the financial repair; successful CI does not mean that blocked rollback passed.

The next scoped rollback reference is now this repaired candidate, pinned by run ID, source SHA and manifest SHA256 `a95d1163305610383a89ab15285907251b4aacf2f79720afe91896ccfc55481b`. GitHub's separate artifact-retrieval job downloaded and verified API/Web/Admin/SBOM. Its small receipt was independently downloaded and checked against GitHub's archive digest. Local full archive transfer timed out, including bounded range recovery; no local archive verification or extraction success is claimed. The reference digest comes from that verified CI receipt, not the incomplete local download.

Current application/runtime inputs match the new reference and include commit 5a22e1b's SQL alias repair. The existing ancestor, distinct release, schema/lock/external module and unchanged-runtime guards remain mandatory. CI will retrieve the newly pinned bytes and run the next limited current → previous → current drill. Its result is pending. No migration rollback, worker compatibility or different-implementation compatibility is authorized by this update.

The staging plan remains historical and blocked: it still references aaf932e. Replace it only after the next repaired-source rollback proof and its same-SHA CI/evidence are retained. Worker flags, hosting prerequisites, trust approvals, formal acceptance and production NO_GO remain unchanged.

Evidence: [reference index](../reviews/evidence/post28/8e001c92a97e0e2f865adce90fc4b3bc6d3b5514/repaired-rollback-reference/index.json). The old blocked receipt is retained separately from the new, unexecuted reference.
