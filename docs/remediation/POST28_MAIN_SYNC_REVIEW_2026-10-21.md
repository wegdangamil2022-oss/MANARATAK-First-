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

## Remaining boundaries

GitHub's branch-protection endpoint returned HTTP 403 for the connected integration; branch-protection requirements have not been independently inspected. All four existing PR review threads were resolved when inspected. PR34 remains draft pending the new candidate's checks and remaining review.

The new web inputs change the exact runtime source compared with the previously pinned rollback reference. Retain the existing rollback-compatibility rejection; do not treat prior rollback evidence as acceptance of this candidate. Any blocked action must be reported separately from successful CI jobs.

No Neon project was created by this work, no application database was contacted, no migration was applied, and no hosting service, paid resource or external deployment was created. The user explicitly deferred creating the working database until after merge preparation. Existing formal release/production restrictions remain in force.
