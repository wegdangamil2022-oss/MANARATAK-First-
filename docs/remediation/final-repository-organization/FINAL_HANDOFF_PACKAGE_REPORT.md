# Final Handoff Package Report

Date: 2026-08-12

## Package Scope

- Source root: `MANARATAK_CURRENT_2026-08-12`
- Planned archive: `MANARATAK_FINAL_HANDOFF_2026-08-12.zip`
- Archive root: `MANARATAK_CURRENT_2026-08-12/`
- Operation type: packaging only
- Database operations: none
- University imports: 0

## Pre-Packaging Verification

| Check | Result |
| --- | --- |
| Unexpected root artifacts | 0 |
| Unclassified files | 0 |
| Broken important relative references | 0 |
| Runtime logs/PID/temp artifacts | 0 |
| University Stage 1 source files | 6 |
| University source SHA-256 mismatches | 0 |
| University records prepared | 10,723 |
| Major source identities | 3,402 |
| International Tests | 56 active + 3 archived |
| Prisma schema changed | NO |
| IDs changed | 0 |
| Relations lost | 0 |
| Real secrets detected | 0 |

## Critical Source Hashes

| File | SHA-256 |
| --- | --- |
| `packages/infrastructure/prisma/schema.prisma` | `33FFC508687FA39BDC471E038930EC7B4AB13229D1C5E73171081AEF3D895AEF` |
| `package-lock.json` | `C20DA6FE1C965FB43C2B8EC4D29CC3F9D98FB655E989A420C94C4087863E50D5` |
| `package.json` | `203D1C376EF1F60CE1AAE679C34BE0BA34848ADA6C2210D7C45E165F6D187CFB` |

## Inclusion And Exclusion Policy

The archive includes the current project's source, migrations, remediation evidence,
workspace import sources, configuration, tests, scripts, and required documentation.

The archive excludes `.git`, dependency directories, generated build and coverage
outputs, caches, temporary files, logs, PID files, runtime dumps, editor caches, real
environment files, and credential material. `.env.example` files are retained as
non-secret configuration templates.

## Final Archive Integrity

The final ZIP SHA-256, byte size, and packaged entry counts are recorded in the
external sidecar report stored beside the immutable ZIP. This avoids a circular hash
dependency in which writing the ZIP hash into this file would change the ZIP itself.

Build/test status: `BUILD/TEST RUNTIME VALIDATION PENDING GOOGLE STUDIO`
