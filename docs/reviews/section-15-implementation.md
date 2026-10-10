# Section 15 — Student Support & Workspace (P15): Implementation Review

> **Review date:** 2026-10-11 · **Status:** **PARTIALLY IMPLEMENTED — FIXES REQUIRED — NOT CLOSED (RUNTIME-PENDING)**  
> **Do not approve production deployment or Section 16 start based on this report.**  
> **Repository:** `wegdangamil2022-oss/MANARATAK-First-`  
> **Working branch:** `codex/section-15-student-support`  
> **Fork point:** `main@9944568a92016b61e3137ba776b3e08a9466afcb`  
> **Plan:** `MANARATAK_ADMIN_REVIEW_CODEX.md`, Section 15 and 15.FG, Library version from 2026-10-08. The plan's older snapshot `bac768e...` is not the implementation baseline.  
> **Commits during review:** `a3dd41a6e26dd2b7482bd829f54c1716a13d2b9f`; `cd7228317f6410f5253271eaabdf8c8e75407f85`; report and filter fix added as a later commit.

## 1. Scope and preservation

Started from the observed latest `main` and created the requested branch; no branch force-push/rebase. GitHub recursive tree contained no `AGENTS.md` anywhere at the inspected main commit, and local instruction files by that exact name were therefore unavailable. Read source and owner contracts before changes.

**Pre-existing retained protections:** inherited `/admin/students` permission `admin:students:support`; elevated support-mutate permission; student JWT/session and `createStudentRoleGuard`; equality check for legacy student-ID routes and self-scoped canonical routes; source-owned learning/certificate/service reads; privacy consent not writable via Support; minimal support workspace fields; cursor pagination; support expectedVersion/reason; atomic P15 audit/outbox on most existing mutations. No duplicate P13/P14/P20 truth tables, no impersonation endpoint, no new migrations.

## 2. Per-task implementation trace (26 plan + 2 annex)

**Legend:** `IMPLEMENTED — SOURCE ONLY` means changes pushed, not runtime-verified; `PARTIAL` means remaining acceptance gaps; `OPEN` means not implemented; `DEFERRED` is intentional after 28.

| Task ID | Priority | State | Code change / finding | Related source files | Acceptance gap |
|---|---|---|---|---|---|
| `STU-ADM-001` | P0 | **IMPLEMENTED — SOURCE ONLY** | إزالة القيم السابقة/اللاحقة للموافقة من audit/outbox؛ إبقاؤها في سجل القرار القانوني. | `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts`، `packages/infrastructure/tests/students/PrismaStudentWorkspaceRepository.spec.ts` | اختبار منع التسرب أضيف ولم ينفّذ. |
| `STU-ADM-002` | P0 | **IMPLEMENTED — SOURCE ONLY** | تقييد قراءات learning/certificates/services في API بصلاحيات كل مالك، والحرمان الافتراضي من القوائم والأعداد. | `apps/api/src/presentation/api/router/StudentSupportAdminRouter.ts`، `packages/application/src/students/use-cases/StudentDashboardHydrationService.ts`، `packages/domain/src/students/index.ts`، `apps/admin/src/pages/StudentSupportAdminPage.tsx` | اعتماد أسماء أذونات المالك الحالية؛ تحتاج مصادقة تشغيلية سلبية. |
| `STU-ADM-003` | P1 | **IMPLEMENTED — SOURCE ONLY** | نقل هوية موظف الدعم وسبب الإجراء ورابط الترابط إلى audit داخل transaction، وإزالة audit النجاح الخارجي غير الذري؛ إبقاء failure audit منفصل. | `apps/api/src/presentation/api/router/StudentSupportAdminRouter.ts`، `packages/application/src/students/use-cases/StudentWorkspaceUseCases.ts`، `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts` | لا يوجد fault-injection على DB حقيقية/معزولة. |
| `STU-ADM-004` | P1 | **IMPLEMENTED — SOURCE ONLY** | CAS بكتابة updateMany مشروطة بالنسخة والحالة، ثم audit/outbox في المعاملة نفسها. | `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts`، `packages/infrastructure/tests/students/PrismaStudentWorkspaceRepository.spec.ts` | اختبار تعارض سلبي بالمصدر؛ سباق DB حقيقي لم ينفذ. |
| `STU-ADM-005` | P1 | **IMPLEMENTED — SOURCE ONLY** | CAS لموافقة الخصوصية قبل إدراج القرار والأثر الذري. | `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts`، `packages/infrastructure/tests/students/PrismaStudentWorkspaceRepository.spec.ts` | يحتاج اختبار تزامن قرار قبول/سحب في DB معزولة. |
| `STU-ADM-006` | P1 | **IMPLEMENTED — SOURCE ONLY** | إلزام expectedVersion في HTTP/Application/Prisma profile؛ إعادة استخدام النسخة التي ترسلها واجهة الطالب حاليًا. | `apps/api/src/presentation/api/router/StudentWorkspaceRouter.ts`، `packages/application/src/students/use-cases/StudentWorkspaceUseCases.ts`، `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts`، `packages/application/tests/students/StudentWorkspaceUseCases.spec.ts` | التحقق من retry/idempotency و409 HTTP لم ينفذ. |
| `STU-ADM-007` | P1 | **OPEN** | Gateway والـworker لا يستهلكان أحداث الشهادات بتمرير وفهرسة وإصدارات موثوقة. | `packages/application/src/students/use-cases/StudentWorkspaceOutboxDeliveryGateway.ts`، `packages/application/src/students/use-cases/StudentWorkspaceOutboxWorker.ts`، `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts` | يتطلب قواعد precedence وout-of-order/replay وتكامل P14. |
| `STU-ADM-008` | P1 | **OPEN** | لا يوجد catch-up موثوق للأحداث السابقة لإسناد Student role. | `packages/application/src/students/use-cases/StudentWorkspaceOutboxDeliveryGateway.ts` | استرجاع تاريخ owner دون بيانات غير مفوضة. |
| `STU-ADM-009` | P1 | **OPEN** | لا يوجد replay محكوم لأحداث inbox المعطلة أثناء suspension عند إعادة التفعيل. | `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts` | يلزم مسار reactivation/retry محكوم. |
| `STU-ADM-010` | P1 | **PARTIAL** | Application ترفض sourceDomain/eventType غير معروف وتضع حدود طول/حجم وتتحقق من التاريخ. | `packages/application/src/students/use-cases/StudentWorkspaceUseCases.ts`، `packages/application/tests/students/StudentWorkspaceUseCases.spec.ts` | لم تكتمل schema/version envelope وتحقق الثقة من المصدر وتسلسل الأحداث. |
| `STU-ADM-011` | P1 | **PARTIAL** | فشل إبطال cache بعد commit لا يحوّل نجاح العملية إلى خطأ HTTP؛ log رمزي دون بيانات. | `packages/application/src/students/use-cases/StudentWorkspaceUseCases.ts` | لا يوجد durable retry/invalidation recovery؛ احتمال stale-cache قائم. |
| `STU-ADM-012` | P1 | **PARTIAL** | إلزام audit للـsupport detail قبل disclosure مع actor وpurpose ثابت ومجالات مرئية. | `apps/api/src/presentation/api/router/StudentSupportAdminRouter.ts`، `apps/api/tests/presentation/api/router/StudentSupportAdminRouter.spec.ts` | لا توجد case-level purpose policy ولا بحث في الاحتفاظ بسجلات القراءة أو audit list. |
| `STU-ADM-013` | P1 | **OPEN** | مالك الدورات والشهادات يُقرأ لقوائم غير محدودة إذا صُرح له. | `packages/application/src/students/use-cases/StudentDashboardHydrationService.ts`، `packages/infrastructure/src/students/StudentDashboardOwnerReadGateways.ts` | يلزم paged/lazy owner contracts مع limits. |
| `STU-ADM-014` | P1 | **OPEN** | لا تظهر مصدر/عمر/نسخة owner read أو آخر sync في ملخص P15. | `packages/domain/src/students/index.ts`، `packages/application/src/students/use-cases/StudentDashboardHydrationService.ts` | لا يجوز مساواة degraded بحالة فارغة. |
| `STU-ADM-015` | P1 | **OPEN** | جدولة وإلغاء reminders تحصل بعد إتمام معاملة tracker؛ احتمال divergence. | `packages/application/src/students/use-cases/StudentApplicationTrackerUseCases.ts`، `packages/infrastructure/src/students/PrismaStudentApplicationTrackerRepository.ts` | يتطلب outbox ذَرّي أو idempotent worker/compensation. |
| `STU-ADM-016` | P1 | **IMPLEMENTED — SOURCE ONLY** | تحديث stage/checklist/archive مشروط id+student+version+ACTIVE في DB transaction. | `packages/infrastructure/src/students/PrismaStudentApplicationTrackerRepository.ts` | يحتاج تنفيذ اختبار تعارض متزامن. |
| `STU-ADM-017` | P1 | **IMPLEMENTED — SOURCE ONLY** | منع كتابة checklist على tracker غير ACTIVE؛ التحقق من ownership للحزمة والitem. | `packages/infrastructure/src/students/PrismaStudentApplicationTrackerRepository.ts` | اختبارات HTTP/DB سلبية لازمة. |
| `STU-ADM-018` | P1 | **OPEN** | تشخيص provisioning missing identity غير مكتمل في Support read. | `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts`، `apps/api/src/presentation/api/router/StudentSupportAdminRouter.ts` | يتطلب reconciliation status مضبوطًا دون منح قدرة provision. |
| `STU-ADM-019` | P1 | **IMPLEMENTED — SOURCE ONLY** | حصر failureCode المعروض في allowlist مع fallback عام. | `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts` | تحتاج اختبارات على رسائل داخلية غير متوقعة. |
| `STU-ADM-020` | P2 | **OPEN** | cursor غير موقّع ولا يرتبط query/status. | `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts` | يلزم signature/filter fingerprint ورفض العبث. |
| `STU-ADM-021` | P2 | **IMPLEMENTED — SOURCE ONLY** | عند conflict في reset يعاد تحميل حالة الطالب ويُطلب تأكيد جديد. | `apps/admin/src/pages/StudentSupportAdminPage.tsx` | لم يُختبر في المتصفح. |
| `STU-ADM-022` | P2 | **IMPLEMENTED — SOURCE ONLY** | إزالة اختيار الطالب السابق عند تبديل query/status أو مسح الفلاتر. | `apps/admin/src/pages/StudentSupportAdminPage.tsx` | لم يُختبر في المتصفح. |
| `STU-ADM-023` | P2 | **OPEN** | واجهة الدعم تحتوي نصوص عربية ثابتة ولا تستخدم عقود ترجمة AR/EN الشاملة. | `apps/admin/src/pages/StudentSupportAdminPage.tsx` | يلزم i18n شامل دون تغيير سلوك الأمن. |
| `STU-ADM-024` | P2 | **PARTIAL** | أضيفت اختبارات Vitest/Supertest لمسارات 403 وscopes وCAS والخصوصية. | `apps/api/tests/presentation/api/router/StudentSupportAdminRouter.spec.ts`، `packages/application/tests/students/StudentDashboardHydrationService.spec.ts`، `packages/application/tests/students/StudentWorkspaceUseCases.spec.ts`، `packages/infrastructure/tests/students/PrismaStudentWorkspaceRepository.spec.ts` | ملفات اختبارات كُتبت فقط ولم تنفّذ؛ runtime/E2E مؤجل. |
| `STU-ADM-025` | P2 | **OPEN** | Support still eager-hydrates مجالات متعددة عند تفاصيل طالب واحد. | `packages/application/src/students/use-cases/StudentDashboardHydrationService.ts`، `apps/admin/src/pages/StudentSupportAdminPage.tsx` | يلزم تبويبات كسولة lazy endpoints مع permission per tab. |
| `STU-ADM-026` | P2 | **DEFERRED AFTER SECTION 28** | لا توجد readiness proofs تشغيلية للتكامل، DB، worker، migration، observability. | `docs/reviews/section-15-implementation.md` | حسب تعديل 2026-10-09 لا تشغيل ثقيل حاليًا. |
| `FGA-15-001` | P1 | **OPEN** | ملخص application tracker عدد فقط؛ لا يوجد bounded/purpose-audited paged support drilldown. | `apps/admin/src/pages/StudentSupportAdminPage.tsx`، `apps/api/src/presentation/api/router/StudentSupportAdminRouter.ts`، `packages/infrastructure/src/students/PrismaStudentApplicationTrackerRepository.ts` | owner-owned minimal DTO،RBAC،audit،page،No notes/docs. |
| `FGA-15-002` | P2 | **OPEN** | لا يوجد server-side triage filter للطلاب مع فشل sync أو خدمات عالقة. | `apps/admin/src/pages/StudentSupportAdminPage.tsx`، `apps/api/src/presentation/api/router/StudentSupportAdminRouter.ts`، `packages/application/src/students/use-cases/StudentDashboardHydrationService.ts` | يجب تصنيف DEGRADED/EMPTY،bounded read،RBAC. |

## 3. Security decisions

- **Consent privacy:** canonical before/after preference values remain solely in `studentPrivacyConsentDecision`. The audit/outbox mutation event carries `decisionId`, changed field names, version and purpose, but no before/after booleans. The source tests assert absence in both downstream records.
- **Cross-domain least privilege:** `admin:students:support` alone never authorizes reading learning, certificates, or services in Support details. Server evaluates `admin:courses:manage`, `admin:certificates:view`, `admin:services:manage` respectively; default deny; owner arrays and sensitive counts omitted or null on restriction. UI `RESTRICTED` is not `EMPTY`.
- **Support actor + atomicity:** support-reset passes principal ID and explicit reason to P15 repository, placing the audit and outbox in the same transaction as the guarded reset write. The API no longer writes an additional successful mutation audit outside the transaction. Failure attempt audit remains independent, as designed.
- **Optimistic concurrency:** `updateMany` with `id`, `version`, `status` guards the workspace profile, consent, snapshot restore and layout reset. Application tracker update, checklist and archive use atomic version and ownership guards; if affected row count is not exactly one, mutation aborts with conflict.
- **IDOR:** retained session/role guard and principal-to-student ownership guard on student routes. Service/invoice/asset owner methods remain source-owned. Dedicated new tests for Support HTTP permissions have been authored; no executed direct-request proof yet.
- **Audit constraints:** sensitive detail reads write required minimal audit before response. Support client receives only permission-authorized owner fields. No raw event payload dumped in new logs.
- **Data integrity:** cache invalidation failures after a successful transaction no longer present a false failed command. This is **not** a durable invalidation solution, and requires follow-on work.

## 4. Verification evidence and boundaries

| Check | Status and evidence |
|---|---|
| GitHub branch from latest main | **PASS** — fork point `9944568...`; existing `main` unchanged by this work |
| Commit-level diff review | **PASS (static)** — fetched patch for both implementation/test commits and inspected changed paths; only student domain, Support UI/API, and focused test files modified; no migrations |
| Static invariant checks | **PASS (static)** — checked source for owner scope enforcement, consent redaction, conditional workspace write, source-event allowlist, and new negative test cases |
| `packages/infrastructure/tests/students/PrismaStudentWorkspaceRepository.spec.ts` | **WRITTEN, NOT RUN** — consent redaction; CAS stale decision/reset; existing consent fixture adapted to conditional writes |
| `packages/application/tests/students/StudentDashboardHydrationService.spec.ts` | **WRITTEN, NOT RUN** — no cross-domain owner reads without grants; limited explicit grants |
| `packages/application/tests/students/StudentWorkspaceUseCases.spec.ts` | **WRITTEN, NOT RUN** — missing expectedVersion; untrusted event family and invalid date |
| `apps/api/tests/presentation/api/router/StudentSupportAdminRouter.spec.ts` | **WRITTEN, NOT RUN** — 403 support read/mutate; owner permission stripping; support actor in reset |
| Type-check/lint/unit test commands | **NOT RUN** — GitHub-only connected workspace; no checkout/dependencies available in local execution container (network DNS for GitHub unavailable). No successful test execution is claimed. |
| Concurrency DB fault-injection / migration check / owner jobs / E2E | **DEFERRED** under 2026-10-09 closure policy; no actual database touched, no migration/reset/seed/backfill/db push, no worker/provider execution |
| Production/browser readiness | **NOT VERIFIED** — cannot infer a live pass from source checks, Vitest files, or empty GitHub status checks |

**Proposed short verification in a trusted checkout before source sign-off (no real DB):** run targeted TypeScript/lint for changed workspaces and targeted Vitest/Supertest files above; fix failures; exercise unauthorized direct HTTP requests in mocked router; check rollback semantics with a transaction mock. **Post-28 authorized operational appendix only:** PostgreSQL version-race and audit rollback fault injection, owner-event replay and idempotency, owner permission policy, cache invalidation recovery, UI flows/SSR, prepared migrations and worker readiness with artifacts of environment and result. No task may be marked runtime `PASS` based solely on code inspection.

## 5. Remaining defects and risk decision

**Material P1 gaps blocking closure:** certificate event flow and out-of-order handling (`007`), late-role catch-up (`008`), suspended inbox replay (`009`), durable invalidation (`011`), bounded owner reads (`013`), owner freshness (`014`), atomic reminder delivery (`015`), identity provisioning diagnostic (`018`), purpose-driven audited tracker drilldown (`FGA-15-001`). Also partial upstream schema/version validation (`010`) and sensitive view governance (`012`). These are **source-confirmed/unresolved**, not claimed runtime exploits.

**P2 outstanding:** cursor signing/filter binding (`020`), full i18n (`023`), comprehensive tests (`024`), lazy tab reads (`025`), triage (`FGA-15-002`), and operational readiness (`026`, formally deferred). Some UI changes lack browser validation.

**Closure verdict:** The original plan records Section 15 as **REVIEWED — FIXES REQUIRED, NOT CLOSED**. This implementation moves several source protections forward but does not satisfy all 28 tasks, nor prove necessary negative tests have passed. Set status **PARTIALLY IMPLEMENTED — FIXES REQUIRED — NOT CLOSED / RUNTIME-PENDING**. **No GO, no claim of completed section, no Section 16 begun.**

## 6. Handoff for independent review

1. Diff [`main...codex/section-15-student-support`](https://github.com/wegdangamil2022-oss/MANARATAK-First-/compare/main...codex/section-15-student-support). Read this report and original 15.2/15.FG acceptance criteria.
2. Verify source-only fixes and test compilation; prioritize remaining P1 end-to-end owner sync, replay, and reminder atomicity before recommending closure.
3. Recheck `main` divergence at review time. Do **not** merge, deploy or apply database mutations until approved in a separately authorized workflow.
