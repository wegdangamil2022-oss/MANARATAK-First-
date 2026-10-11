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
| `STU-ADM-007` | P1 | **PARTIAL — SOURCE ONLY** | وصلت 6 أحداث P14 للشهادات عبر gateway/worker، مع توثيق أصل P14 وحقول الحد الأدنى ومقارنة ترتيب أحداث certificate السابقة؛ أضيف studentReferenceId لأحداث انتهاء الصلاحية وملفات الشهادة في emitter المالك. | `packages/application/src/students/use-cases/StudentWorkspaceOutboxDeliveryGateway.ts`، `packages/application/src/students/use-cases/StudentWorkspaceOutboxWorker.ts`، `packages/infrastructure/src/certificates/PrismaCertificateRepository.ts`، `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts`، `apps/api/src/infrastructure/runtime/PollingWorkerBootstrapper.ts` | لم ينفذ replay DB حقيقي؛ ما زال عدم وصول حدث الإصدار أو الترتيب الاستثنائي (old replacement event) يحتاج owner reconciliation. |
| `STU-ADM-008` | P1 | **OPEN** | لا يوجد catch-up موثوق للأحداث السابقة لإسناد Student role. | `packages/application/src/students/use-cases/StudentWorkspaceOutboxDeliveryGateway.ts` | استرجاع تاريخ owner دون بيانات غير مفوضة. |
| `STU-ADM-009` | P1 | **PARTIAL — SOURCE ONLY** | أضيف recovery worker لدُفعات <=25 من Inbox المحجوز أثناء SUSPENDED، وبشرط ACTIVE وtransaction CAS وreplay للـtimeline/projections/notifications. الحدث السام يُعزل برمز غير حساس. | `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts`، `packages/application/src/students/use-cases/StudentWorkspaceOutboxWorker.ts`، `apps/api/src/infrastructure/runtime/PollingWorkerBootstrapper.ts`، `apps/api/src/infrastructure/di/container.ts`، `packages/infrastructure/tests/students/PrismaStudentWorkspaceRepository.spec.ts` | يعتمد على تفعيل worker، ولم تُفحص دورة suspend/reactivate على DB؛ owner ordering والخروج من quarantine يحتاجان إثباتًا. |
| `STU-ADM-010` | P1 | **PARTIAL — SOURCE ONLY** | Allowlist للدومينات وأنواع الأحداث وحدود الحجم والتاريخ؛ قيد sourcePhase='Phase14' لأحداث الشهادات ورفض aggregate mismatch. | `packages/application/src/students/use-cases/StudentWorkspaceUseCases.ts`، `packages/application/src/students/use-cases/StudentWorkspaceOutboxDeliveryGateway.ts`، `packages/application/tests/students/StudentWorkspaceOutboxDeliveryGateway.spec.ts` | يلزم typed versioned event envelope لكل المالكين وtrusted source gateway contract شامل. |
| `STU-ADM-011` | P1 | **IMPLEMENTED — SOURCE ONLY** | أصبح getDashboard يقرأ المرجع المعتمد بدل Redis cache القديم؛ Cache.write/delete errors لا تسبب failure بعد نجاح العملية. تم تعليق قراءة Redis مؤقتًا لتفادي stale workspace snapshot. | `packages/application/src/students/use-cases/StudentWorkspaceUseCases.ts`، `packages/application/tests/students/StudentWorkspaceUseCases.spec.ts` | مقايضة أداء واضحة: لا يُعاد تمكين Redis read قبل durable generation؛ القياسات التشغيلية مؤجلة. |
| `STU-ADM-012` | P1 | **PARTIAL — SOURCE ONLY** | أضيف audit REQUIRED لكل من قائمة الدعم وdetail وtracker case page قبل إفشاء النتائج، مع purpose رمزي وعدم حفظ query الخام. | `apps/api/src/presentation/api/router/StudentSupportAdminRouter.ts`، `apps/api/tests/presentation/api/router/StudentSupportAdminRouter.spec.ts` | تحتاج حوكمة retention/case-id/approval وربط المقصود بطلب دعم فعلي. |
| `STU-ADM-013` | P1 | **OPEN** | مالك الدورات والشهادات يُقرأ لقوائم غير محدودة إذا صُرح له. | `packages/application/src/students/use-cases/StudentDashboardHydrationService.ts`، `packages/infrastructure/src/students/StudentDashboardOwnerReadGateways.ts` | يلزم paged/lazy owner contracts مع limits. |
| `STU-ADM-014` | P1 | **OPEN** | لا تظهر مصدر/عمر/نسخة owner read أو آخر sync في ملخص P15. | `packages/domain/src/students/index.ts`، `packages/application/src/students/use-cases/StudentDashboardHydrationService.ts` | لا يجوز مساواة degraded بحالة فارغة. |
| `STU-ADM-015` | P1 | **PARTIAL — SOURCE ONLY** | عُزل فشل Notification بعد commit عن نجاح Tracker؛ أصبح الحذف قبل cancel، والنسخة تتغير في reminder حتى عند تحديث stage فقط. | `packages/application/src/students/use-cases/StudentApplicationTrackerUseCases.ts`، `packages/application/tests/students/StudentApplicationTrackerUseCases.spec.ts` | ما زالت durable reminder intent/outbox مع retry وتصالح المالك غير موجودة؛ لا يجوز اعتبار إرسال التذكير مضمونًا. |
| `STU-ADM-016` | P1 | **IMPLEMENTED — SOURCE ONLY** | تحديث stage/checklist/archive مشروط id+student+version+ACTIVE في DB transaction. | `packages/infrastructure/src/students/PrismaStudentApplicationTrackerRepository.ts` | يحتاج تنفيذ اختبار تعارض متزامن. |
| `STU-ADM-017` | P1 | **IMPLEMENTED — SOURCE ONLY** | منع كتابة checklist على tracker غير ACTIVE؛ التحقق من ownership للحزمة والitem. | `packages/infrastructure/src/students/PrismaStudentApplicationTrackerRepository.ts` | اختبارات HTTP/DB سلبية لازمة. |
| `STU-ADM-018` | P1 | **OPEN** | تشخيص provisioning missing identity غير مكتمل في Support read. | `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts`، `apps/api/src/presentation/api/router/StudentSupportAdminRouter.ts` | يتطلب reconciliation status مضبوطًا دون منح قدرة provision. |
| `STU-ADM-019` | P1 | **IMPLEMENTED — SOURCE ONLY** | حصر failureCode المعروض في allowlist مع fallback عام. | `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts` | تحتاج اختبارات على رسائل داخلية غير متوقعة. |
| `STU-ADM-020` | P2 | **OPEN** | cursor غير موقّع ولا يرتبط query/status. | `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts` | يلزم signature/filter fingerprint ورفض العبث. |
| `STU-ADM-021` | P2 | **IMPLEMENTED — SOURCE ONLY** | عند conflict في reset يعاد تحميل حالة الطالب ويُطلب تأكيد جديد. | `apps/admin/src/pages/StudentSupportAdminPage.tsx` | لم يُختبر في المتصفح. |
| `STU-ADM-022` | P2 | **IMPLEMENTED — SOURCE ONLY** | إزالة اختيار الطالب السابق عند تبديل query/status أو مسح الفلاتر. | `apps/admin/src/pages/StudentSupportAdminPage.tsx` | لم يُختبر في المتصفح. |
| `STU-ADM-023` | P2 | **OPEN** | واجهة الدعم تحتوي نصوص عربية ثابتة ولا تستخدم عقود ترجمة AR/EN الشاملة. | `apps/admin/src/pages/StudentSupportAdminPage.tsx` | يلزم i18n شامل دون تغيير سلوك الأمن. |
| `STU-ADM-024` | P2 | **PARTIAL — SOURCE ONLY** | أضيفت اختبارات negative gateway (6 certificate types), role/aggregate/source, parked replay CAS والـpoison events، دعم track case + audit، reminders وRedis stale. | `packages/application/tests/students/StudentWorkspaceOutboxDeliveryGateway.spec.ts`، `packages/application/tests/students/StudentWorkspaceOutboxWorker.spec.ts`، `packages/application/tests/students/StudentApplicationTrackerUseCases.spec.ts`، `apps/api/tests/presentation/api/router/StudentSupportAdminRouter.spec.ts`، `packages/infrastructure/tests/students/PrismaStudentWorkspaceRepository.spec.ts` | الاختبارات مكتوبة ولم تُنفذ؛ TypeScript + Vitest المستهدف ما زالا NOT RUN. |
| `STU-ADM-025` | P2 | **OPEN** | Support still eager-hydrates مجالات متعددة عند تفاصيل طالب واحد. | `packages/application/src/students/use-cases/StudentDashboardHydrationService.ts`، `apps/admin/src/pages/StudentSupportAdminPage.tsx` | يلزم تبويبات كسولة lazy endpoints مع permission per tab. |
| `STU-ADM-026` | P2 | **DEFERRED AFTER SECTION 28** | لا توجد readiness proofs تشغيلية للتكامل، DB، worker، migration، observability. | `docs/reviews/section-15-implementation.md` | حسب تعديل 2026-10-09 لا تشغيل ثقيل حاليًا. |
| `FGA-15-001` | P1 | **PARTIAL — SOURCE ONLY** | أضيف endpoint paged (<=50) مع purpose enum وصلاحية admin:students:support وAudit REQUIRED؛ تعرض الواجهة ID/phase/status/deadline/update فقط ولا تعيد notes/documents/checklist. | `packages/infrastructure/src/students/PrismaStudentApplicationTrackerRepository.ts`، `packages/application/src/students/use-cases/StudentApplicationTrackerUseCases.ts`، `apps/api/src/presentation/api/router/StudentSupportAdminRouter.ts`، `apps/admin/src/pages/StudentSupportAdminPage.tsx`، `apps/api/tests/presentation/api/router/StudentSupportAdminRouter.spec.ts` | سجل أحداث/timeline tracker وتقييم pagination الحقيقي بالـDB والواجهة لم ينجزا، فلا تُغلق. |
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


## 7. Continuation — 2026-10-11, branch-only implementation

**Further pushed commits, after the initial three commits:**

- `1e8c6bee5de7e736f2d7d57a66d9b7101cfe5e60` — certificate lifecycle fanout P14 → P15 (Issued, Revoked, Reissued, Renewed).
- `c07b3356d928bede6a01f707ac9095acce552ca3` — read-only bounded, purpose-audited P15 tracker case view.
- `9a34e3784dc088d201c0b56a9333ae09216b0048` — negative gateway/HTTP tests and canonical P15 dashboard reads (Redis cache read disabled pending durable invalidation policy).
- `deb952282cd780d6d9b64f49c7b15d544c4cde3e` — reminder post-commit failure isolation, nondeadline version rotation, cancel-after-delete.
- `31ae648ed3ecae1a217becb49ebe2060f815400a` — P14 emission gains minimal student subject for CertificateExpired/CertificateArtifactsRendered, six lifecycle types wired to P15.
- `5669a35be546ee226c3008904e5ebe66b12d3503` — more P14 negative tests + reissued source-version guard.
- `af7265fe7482c51ced3b8b39150dda0f8979a390` — 25-item bounded recovery from suspended Inbox with ACTIVE status and transactional CAS, wired to opt-in student outbox worker.
- `5b48096b4598589a73e0b3cb4de52504d9cb77f9` — recovery worker and poison-envelope regression tests.
- `33eb4d1cfa653cbd9997125946e9257c408738cb` — audit support list reads and require Phase14 certificate origin.

**Explicit source-policy caveats:**

1. **Runtime not executed.** GitHub connector writes and source/diff inspection work. The local execution container cannot reach the GitHub host to clone the complete repository and run project Vitest/TypeScript; therefore all test assertions described here are *authored*, not claimed green. No DB, migration, seed, worker, provider, browser, or E2E run was attempted.
2. **Certificate delivery is not declared closed.** Although 6 event types now have workers and P14 source references, there is no executed transaction replay. Event ordering for legacy owner events, late student role and missing original certificate during reissue are incomplete. `CertificateArtifactsRendered` deliberately raises `STUDENT_CERTIFICATE_PROJECTION_PENDING` if its original issue is missing: worker retry and reconciliation must be verified.
3. **Parked replay is bounded and gated.** Recovery only picks `WORKSPACE_SYNC_BLOCKED_SUSPENDED` for ACTIVE workspace rows, CAS claims with a rollback transaction, quarantines bad envelope and logs no private payload. If worker is disabled or an event is quarantined, projection remains pending. ARCHIVED rows are never included.
4. **Tracker cases are read-only, not an impersonation route.** Support scope + enumerated purpose + mandatory audit protect stage/status/deadline pages with `take:limit+1`; no notes, checklist, or documents are returned. The user-facing student tracker owner continues to own the data.
5. **Reminder semantics remain a major open risk.** Failed notification delivery no longer falsely reports a committed tracker change as failed, but there is no durable notification reconciliation or a tested guarantee of exactly-once scheduling/cancellation. Operational incident workflow must be designed before closure.
6. **Cache policy is temporarily correctness-first.** Canonical DB read always wins. Redis no longer serves dashboards until durable invalidation/version generation with recovery and proof; this trades cache acceleration for avoiding stale personal data.
7. **Additional source tests** now cover gateway P14 allowlist, missing identity subject/foreign aggregate, worker event selection, source-origin spoof, protected case-page HTTP read, reminder delivery outage, cache stale snapshot rejection and suspended Inbox recovery.
8. **No production or real database mutation.** No migration execution, seed, db push, schema reset, merge, deployment or Section 16 started.

### Remaining closure blockers

`STU-ADM-007/008/009/010/012/013/014/015/018` remain unverified or only partially addressed at the precise plan acceptance level. `FGA-15-001` has a minimal page but no event timeline/DB proof. `FGA-15-002` server-side triage is not built. `STU-ADM-020/023/025` are still open. `STU-ADM-026` stays deferred after Section 28; do not treat its deferral as production verification.

**Final decision for this continuation: `PARTIALLY IMPLEMENTED — FIXES REQUIRED — NOT CLOSED`.** The independently reviewable code is on `codex/section-15-student-support`; no claims of passing Vitest, TypeScript, runtime or production readiness are made.
