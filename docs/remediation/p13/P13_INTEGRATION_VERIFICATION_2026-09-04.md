# P11–P13 integration verification

Integrated from `MANARATAK_FINAL_P13_FINAL_SOURCE_CLOSED_2026-09-03.zip`
onto accepted main `2fb0a2c1adc6b130fd5e38de931115de2f52638e`.
The source delta was compared against the P10 archive snapshot, preserving
the previously accepted integration fixes. Dependency folders, generated
build output and unrelated workspace files were not imported.

## Integration repairs

- Run the installed Prisma CLI through Node so the source gate works on
  Windows as well as Linux. The fixed local validation URL has no embedded
  credentials; the gate only validates the schema and generates the client.
- Select TAP explicitly for the nested architecture contract tests, avoiding
  reliance on the default Node test reporter.
- Preserve canonical university relationship IDs and render legacy labels
  without a link when no ID exists; fix their inferred TypeScript shape.
- Update the student router fixture for the new dashboard hydration service.
- Add three hydration regression tests for owner reads, degraded owner
  responses without stale data, and workspace failure propagation.

## Local evidence

- W0–W16 remediation contract: 17/17 passing.
- P7, P8, P9, P10: 16/16, 54/54, 97/97, 96/96 passing.
- P11, P12, P13: 119/119, 188/188, 98/98 passing.
- Source architecture, source quality and credential scan: passing.
- Prisma schema validation and client generation: passing, no DB connection.
- Root TypeScript project-reference check: passing.
- Web, admin and API builds: passing (admin bundle-size warning remains).
- Complete Unit run: 315 files, 1837 tests passing; the three newly added
  hydration regressions also pass in a separate targeted run.

These are source-level results, not runtime certification. Database-backed
tests, migration execution, browser E2E and external integration validation
remain out of scope. No schema or migration files were changed in this delta.
Historical archive reports are retained as historical evidence; remote CI
results must be read from the Actions run for the resulting integration SHA.
