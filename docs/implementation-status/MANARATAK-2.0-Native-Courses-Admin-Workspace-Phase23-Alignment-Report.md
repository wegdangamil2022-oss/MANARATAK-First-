# MANARATAK 2.0 Native Course Builder — Implementation Status

**Document ID:** MANARATAK-PHASE13-NATIVE-COURSE-BUILDER

**Date:** August 2026
**Status:** SOURCE IMPLEMENTED — RUNTIME DATABASE ROLLOUT REQUIRED

## Implemented source contract

- `/admin/courses/native` reads the canonical Phase 13 course API with `originType=NATIVE_MANARATAK_COURSE`.
- Creating a course persists a real `DRAFT` through `POST /api/v1/admin/courses` and navigates using the returned database ID.
- Native identity (`id`, `publicId`, `slug`, canonical name, and dedup key) is created once and is not regenerated when the display title changes.
- Silent sample/fallback courses and fabricated detail records were removed.
- The former placeholder action modals were replaced by persisted basics, module, lesson, asset, quiz, and question workflows.
- The Course Builder uses an Arabic-first green header, focused section navigation, lesson editing, student preview, and a compact readiness panel.
- Curriculum and progress repositories now use real Prisma persistence instead of unavailable placeholders.
- Module/lesson deletion is denied for published or archived courses. Module/lesson ordering is persisted transactionally.
- Lesson assets accept only active Phase 05 EAP assets; raw HTTP URLs and inactive/quarantined assets fail closed.
- Native readiness is evaluated by the Phase 13 application layer and is re-evaluated before review, publish readiness, and publication.
- Phase 13 stores completion eligibility and emits completion signals only. Phase 14 remains the certificate issuer.

## Runtime rollout still required

The source migration `20260824120000_phase13_native_learning_persistence` adds curriculum, assessment, enrollment, progress, quiz-attempt, and completion tables. It was intentionally not applied during source implementation. The controlled runtime deployment must:

1. provision PostgreSQL and set `DATABASE_URL`;
2. apply the committed migrations once through the approved deployment path;
3. configure the production/staging Phase 05 asset storage, malware-scanning, and sanitization providers;
4. verify readiness and the Native Course create/edit/publish flow against the deployed database;
5. keep asset mutation endpoints fail-closed until the runtime asset capability is ready.

## Boundary status

| Boundary                                         | Status                                         |
| ------------------------------------------------ | ---------------------------------------------- |
| Imported-course identity and controlled transfer | Unchanged                                      |
| No automatic publication                         | Enforced                                       |
| Raw file/path storage inside Course              | Forbidden                                      |
| Phase 05 asset lifecycle                         | Required and verified before lesson attachment |
| Phase 14 certificate issuance                    | Not implemented in Phase 13                    |
| Phase 19 payment execution                       | Not implemented in Phase 13                    |
| Database runtime proof                           | Pending controlled deployment                  |

This report deliberately distinguishes source completion from runtime database deployment. It does not claim that migrations were applied or that production asset providers were configured.
