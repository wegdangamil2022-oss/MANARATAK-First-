# Main synchronization and PR34 conflict review

This change merges `main` at `cd743f9ae0d01ebb604d5a39adbee6c74ceb48e9` into the existing repair branch, whose previous head was `9039538e48ea4039b7c69088e87729b69dcb0936`. Their common ancestor was `b1702289f43d0363d7bbf91f8eba465e4355c53c`. No push or merge to `main` is performed by this change.

## Actual blocker and resolution

The branches had 119 main-only commits and 434 repair-only commits. A real three-way merge identified exactly two conflicting paths:

- `apps/web/src/features/certificates/StudentCertificateActions.tsx`: keep the newer prototype's visibly invalid demo preview and its disabled real download/verification, while keeping authenticated `getMyCertificateArtifactBlob` delivery in live mode. Do not restore the old direct fetch of provider grants. The other main student layout, navigation and preview changes are retained.
- `vercel.json`: preserve main's SPA fallback and the repair branch's disabled deployment for `feat/post28-r07-artifact-preparation`. This does not authorize a main deployment or establish that other branches are disabled.

The main update removed the public-template guest workspace component. Its old localization test therefore imported a nonexistent module and failed TypeScript. Move that check to the current student entry and certificate empty state, retaining the strict English-only rendering assertion and explicit translated content. Add a contract for the current account, favorites and tracker routes instead of reviving the deleted guest implementation. This is not evidence that the entire redesigned private workspace is localized in English.

## Scoped local validation

- Five new behavioral certificate-action cases passed: authenticated preview and object-URL cleanup, authenticated PDF download and cleanup, denied access, invalid PDF MIME rejection, and prototype isolation from real endpoints/downloads/verification links.
- The four existing application-document cases passed because main changed their preview/live client selection.
- The nine public-component copy cases and five public localized-page/route cases passed. The page-contract suite was repeated only after adding its canonical workspace route case.
- Web TypeScript project build passed after fixing the obsolete import.
- The actual Vite production web build passed, transforming 2,502 modules. Its approximately 5 MB main JavaScript chunk remains performance debt; this is not a performance acceptance claim.
- Scoped ESLint, source-quality cycle/accessibility checks, merged Vercel JSON checks and the repository secret scanner passed. No baseline, assertion or security guard was disabled.

The previously published head `9039538` had a successful six-job Actions run: [39664567116](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/39664567116). Its Linux job included the scoped rollback/forward drill. That evidence belongs to the previous source, not this merge candidate. New CI results must be checked separately after publishing this merge.

## Follow-up after publishing the first merge candidate

GitHub reported PR34 mergeable after publishing `74e9b47c67136d6b2e50a0fd76326f2be3c6fbcb`. The first new [push CI run](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/39671412821) and [PR CI run](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/39671419319) exposed stale environment inventory source locations: main introduced additional readers of `VITE_PUBLIC_TEMPLATE_DATA_MODE`. Regenerate the inventory with its existing generator; preserve the drift rejection. There are still 327 variable names, and no environment values are read.

The [PR security run](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/39671419218) rejected the locked Vite 6.4.3 dependency. Update only Vite to 6.4.5 and its declared minimum in root/Web/Admin manifests, preserving the major version and all audit thresholds. The maintainer's [filesystem advisory](https://github.com/vitejs/vite/security/advisories/GHSA-rq7h-c2jc-7f22) identifies 6.4.4 as the patched 6.x floor; the selected newer patch also removes the other advisories returned by npm. Local production dependency audit now reports zero vulnerabilities. Secret scan, dependency review and CodeQL had passed on the first candidate; their new-head results remain separate.

During this work main advanced by five student UI commits to `9b007982cdd2f962766ed709387676e2e90c5df0`. Integrate those changes into the repair branch without conflicts, preserving the newer saved-item and career layout. This is another merge into the repair branch, not a push to main.

Validation after these changes: source preflight passed including its 37 registered checks; Web TypeScript passed; 19 selected certificate/copy/route cases passed on the patched Vite runner. Those cases were repeated because the runner dependency and merged workspace routes changed. Web and Admin production Vite builds both passed on 6.4.5. The existing source-quality gate and secret scanner passed. Scoped ESLint had zero errors and 16 warnings in the incoming student components. Large bundles and Admin's existing unresolved `/admin/fonts/` references remain deployment/performance follow-ups; no complete hosting acceptance is claimed. Fresh CI must be observed on the resulting published SHA.

## Remaining boundaries

GitHub's branch-protection endpoint returned HTTP 403 for the connected integration; branch-protection requirements have not been independently inspected. All four existing PR review threads were resolved when inspected. PR34 remains draft pending the new candidate's checks and remaining review.

The new web inputs change the exact runtime source compared with the previously pinned rollback reference. Retain the existing rollback-compatibility rejection; do not treat prior rollback evidence as acceptance of this candidate. Any blocked action must be reported separately from successful CI jobs.

No Neon project was created by this work, no application database was contacted, no migration was applied, and no hosting service, paid resource or external deployment was created. The user explicitly deferred creating the working database until after merge preparation. Existing formal release/production restrictions remain in force.
