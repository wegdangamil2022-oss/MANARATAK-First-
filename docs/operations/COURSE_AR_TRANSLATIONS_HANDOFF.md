# Course Arabic translations — development handoff

This branch contains the unfinished course translation importer, admin UI,
public projection, domain policy, and related tests only. It is based on main
at 89a729c2330307bc1802aaeaf5fc215a51db987b, which already includes the unchanged
owner-supplied workbook:

`workspace/import-sources/course-translations/MANARATAK_All_21562_Courses_AR_Merged.xlsx`

Workbook SHA256: `b950b9254365212f867d41479d0a4025d6ed4c63fc3b6bf0ab2ffb8f8d39b599`.
There are 21,562 source rows and 21,559 distinct course URLs. The preparer groups
canonical URLs, selects the earliest source row, and preserves duplicate source
variants as provenance. Some workbook topics are inferred from titles rather
than verified official syllabi.

## Scope and execution state

- No final database import has been applied. Do not run an import from this handoff.
- No database connection/bootstrap files, credentials, private database snapshots,
  frozen import plan, or machine-specific execution wrappers are included.
- The persistence helper is a library, not an automatic import entry point. It
  must be called within the existing audited transaction coordinator, using a
  validated plan and an explicitly authorized database context.
- Source facts, relationships, teaching language, and publication status must stay
  unchanged. Importing translations does not publish courses.
- Unrelated scholarship and major changes are excluded.

## Known validation results before handoff

The initial focused suite passed 15 tests. The subsequent broader course run
passed 384 tests and failed 3 tests (49 passing files, 2 failing files). This is
unfinished work; these failures are not resolved by this handoff.

`apps/admin/tests/courses/ExternalCourseInteractions.spec.tsx`:

1. `verifies the exact persisted version and status before notifying the catalog`
2. `blocks another command when a successful response has no matching publication readback`

`packages/application/tests/courses/Section13FrozenTranslationAndDisclosure.spec.ts`:

3. `does not let native creation bypass the central translation write freeze`

The third failure expected `TRANSLATION_CONTENT_AUTHORING_DISABLED` but received
`this.courseRepository.findByDedupKey is not a function`. Inspect the native
creation path and distinguish dedicated versioned translation commands from
unversioned generic translation payloads; do not merely weaken assertions.

An earlier typecheck passed before the final edits. Repeat typecheck and relevant
admin/API/public/parser tests after fixes. Also validate JSON presence-filter null
semantics, editor readback and concurrency, authorization, and public metadata
allowlisting. Do not merge or import until the remaining work is reviewed and
validated under a later explicit instruction.

## Follow-up verification

The course dashboard uses **Courses → External courses**. Its Arabic text
presence filter checks for stored title and description values; the row badge
also checks the stored source and value evidence. Open a course and expand
**Arabic translation** to edit those values through the versioned command.
The Translation Workspace reads the stored course title/description and marks
the translation as saved, independently of publication.

Before applying, the Neon project `manaratak-platform-start-20261022`, default
branch `main`, database `neondb` had 21,559 course records matching the workbook
URL set. All were `IMPORTED`. The Arabic presence filter counted zero with both
text values and 21,559 without them. No database writes were performed in this
verification. The official app-role bootstrap, private frozen plan, and
execution wrapper from the original workstation are required to continue that
run.

The public Arabic route is `/ar/courses`. The English route `/en/courses`
depends on the site's existing English release switch. The teaching-language
filter uses the original course language in either locale.
