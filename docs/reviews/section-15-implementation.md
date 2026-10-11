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
| `STU-ADM-003` | P1 | **IMPLEMENTED — SOURCE ONLY** | P15 support reset remains audit/outbox atomic. Tracker create/update/checklist/archive/remove now also writes private-minimal AuditRecord and P15 Timeline in the same transaction as reminder Outbox. | `apps/api/src/presentation/api/router/StudentSupportAdminRouter.ts`، `packages/application/src/students/use-cases/StudentWorkspaceUseCases.ts`، `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts` | Fault-injection and transactional rollback still need actual DB verification, not source-only tests. |
| `STU-ADM-004` | P1 | **IMPLEMENTED — SOURCE ONLY** | CAS بكتابة updateMany مشروطة بالنسخة والحالة، ثم audit/outbox في المعاملة نفسها. | `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts`، `packages/infrastructure/tests/students/PrismaStudentWorkspaceRepository.spec.ts` | اختبار تعارض سلبي بالمصدر؛ سباق DB حقيقي لم ينفذ. |
| `STU-ADM-005` | P1 | **IMPLEMENTED — SOURCE ONLY** | CAS لموافقة الخصوصية قبل إدراج القرار والأثر الذري. | `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts`، `packages/infrastructure/tests/students/PrismaStudentWorkspaceRepository.spec.ts` | يحتاج اختبار تزامن قرار قبول/سحب في DB معزولة. |
| `STU-ADM-006` | P1 | **IMPLEMENTED — SOURCE ONLY** | إلزام expectedVersion في HTTP/Application/Prisma profile؛ إعادة استخدام النسخة التي ترسلها واجهة الطالب حاليًا. | `apps/api/src/presentation/api/router/StudentWorkspaceRouter.ts`، `packages/application/src/students/use-cases/StudentWorkspaceUseCases.ts`، `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts`، `packages/application/tests/students/StudentWorkspaceUseCases.spec.ts` | التحقق من retry/idempotency و409 HTTP لم ينفذ. |
| `STU-ADM-007` | P1 | **PARTIAL — SOURCE ONLY** | وصلت 6 أحداث P14 للشهادات عبر gateway/worker، مع توثيق أصل P14 وحقول الحد الأدنى ومقارنة ترتيب أحداث certificate السابقة؛ أضيف studentReferenceId لأحداث انتهاء الصلاحية وملفات الشهادة في emitter المالك. | `packages/application/src/students/use-cases/StudentWorkspaceOutboxDeliveryGateway.ts`، `packages/application/src/students/use-cases/StudentWorkspaceOutboxWorker.ts`، `packages/infrastructure/src/certificates/PrismaCertificateRepository.ts`، `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts`، `apps/api/src/infrastructure/runtime/PollingWorkerBootstrapper.ts` | لم ينفذ replay DB حقيقي؛ ما زال عدم وصول حدث الإصدار أو الترتيب الاستثنائي (old replacement event) يحتاج owner reconciliation. |
| `STU-ADM-008` | P1 | **PARTIAL — SOURCE ONLY** | استرجاع 50 سجلًا كحد أقصى من مصادر الدورات P13 والشهادات P14 عند RoleAssignmentCreated المتأخر؛ أحداث التعويض تحمل معرّفات مشتقة ثابتة وتُعرض فقط لحساب ACTIVE. | `packages/application/src/students/use-cases/StudentWorkspaceOutboxDeliveryGateway.ts` | تجاوز 50 سجلًا يفشل مع CATCHUP_PAGE_REQUIRED؛ الاسترجاع المرحلي/الكبير وDB replay غير مثبتين. |
| `STU-ADM-009` | P1 | **PARTIAL — SOURCE ONLY** | أضيف recovery worker لدُفعات <=25 من Inbox المحجوز أثناء SUSPENDED، وبشرط ACTIVE وtransaction CAS وreplay للـtimeline/projections/notifications. الحدث السام يُعزل برمز غير حساس. | `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts`، `packages/application/src/students/use-cases/StudentWorkspaceOutboxWorker.ts`، `apps/api/src/infrastructure/runtime/PollingWorkerBootstrapper.ts`، `apps/api/src/infrastructure/di/container.ts`، `packages/infrastructure/tests/students/PrismaStudentWorkspaceRepository.spec.ts` | يعتمد على تفعيل worker، ولم تُفحص دورة suspend/reactivate على DB؛ owner ordering والخروج من quarantine يحتاجان إثباتًا. |
| `STU-ADM-010` | P1 | **PARTIAL — SOURCE ONLY** | Allowlist للدومينات وأنواع الأحداث وحدود الحجم والتاريخ؛ قيد sourcePhase='Phase14' لأحداث الشهادات ورفض aggregate mismatch. | `packages/application/src/students/use-cases/StudentWorkspaceUseCases.ts`، `packages/application/src/students/use-cases/StudentWorkspaceOutboxDeliveryGateway.ts`، `packages/application/tests/students/StudentWorkspaceOutboxDeliveryGateway.spec.ts` | يلزم typed versioned event envelope لكل المالكين وtrusted source gateway contract شامل. |
| `STU-ADM-011` | P1 | **IMPLEMENTED — SOURCE ONLY** | أصبح getDashboard يقرأ المرجع المعتمد بدل Redis cache القديم؛ Cache.write/delete errors لا تسبب failure بعد نجاح العملية. تم تعليق قراءة Redis مؤقتًا لتفادي stale workspace snapshot. | `packages/application/src/students/use-cases/StudentWorkspaceUseCases.ts`، `packages/application/tests/students/StudentWorkspaceUseCases.spec.ts` | مقايضة أداء واضحة: لا يُعاد تمكين Redis read قبل durable generation؛ القياسات التشغيلية مؤجلة. |
| `STU-ADM-012` | P1 | **PARTIAL — SOURCE ONLY** | Owner tabs are separate RBAC-checked and REQUIRED-audited reads; triage and tracker history include purpose-minimized audit. Raw query text/notes are not copied to audit. | `apps/api/src/presentation/api/router/StudentSupportAdminRouter.ts`، `apps/api/tests/presentation/api/router/StudentSupportAdminRouter.spec.ts` | Case approval/retention binding and external-case ticket policy are still missing. |
| `STU-ADM-013` | P1 | **IMPLEMENTED — SOURCE ONLY** | تعديل حدود P13 Prisma course enrollments وP14 certificate read model إلى حد 51 للرصد، وعرض أول 12 سجلًا فقط للدعم مع TRUNCATED وعدد null حين النتيجة جزئية. | `packages/application/src/students/use-cases/StudentDashboardHydrationService.ts`، `packages/infrastructure/src/students/StudentDashboardOwnerReadGateways.ts` | النطاق الشخصي يعرض 50 كحد أقصى ويشير إلى DEGRADED عند الاقتطاع؛ يلزم pagination كامل للأعداد الكبيرة واختبار query plans. |
| `STU-ADM-014` | P1 | **PARTIAL — SOURCE ONLY** | إضافة ownerReadProvenance (P13/P14/P20، queriedAt، returned، limit، complete) وواجهة تفرق AVAILABLE/TRUNCATED/RESTRICTED/DEGRADED. | `packages/domain/src/students/index.ts`، `packages/application/src/students/use-cases/StudentDashboardHydrationService.ts` | queriedAt وقت الاستعلام فقط، وليس وقت تحديث المصدر؛ owner version والـlast-sync ما زالا غير متاحين. |
| `STU-ADM-015` | P1 | **PARTIAL — SOURCE ONLY** | استبدال إرسال reminder مباشرة بحدث P15 ذري داخل كل معاملة Tracker create/update/checklist/archive/remove مع Outbox مستقل قابل لإعادة المحاولة، ومستهلك يقارن النسخة الحالية ويلغي القديمة. | `packages/application/src/students/use-cases/StudentApplicationTrackerUseCases.ts`، `packages/application/tests/students/StudentApplicationTrackerUseCases.spec.ts` | لم يُختبر ضمان التسليم عبر DB/worker/notification فعليًا؛ تفعيل STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED مطلوب وتحتاج مراقبة dead letters. |
| `STU-ADM-016` | P1 | **IMPLEMENTED — SOURCE ONLY** | تحديث stage/checklist/archive مشروط id+student+version+ACTIVE في DB transaction. | `packages/infrastructure/src/students/PrismaStudentApplicationTrackerRepository.ts` | يحتاج تنفيذ اختبار تعارض متزامن. |
| `STU-ADM-017` | P1 | **IMPLEMENTED — SOURCE ONLY** | منع كتابة checklist على tracker غير ACTIVE؛ التحقق من ownership للحزمة والitem. | `packages/infrastructure/src/students/PrismaStudentApplicationTrackerRepository.ts` | اختبارات HTTP/DB سلبية لازمة. |
| `STU-ADM-018` | P1 | **IMPLEMENTED — SOURCE ONLY** | إضافة provisioning-diagnostic إداري قراءة فقط يفحص هوية الطالب ودوره ومساحة P15 ويعيد رموز سبب مقيدة مع Audit REQUIRED دون أي provisioning أو PII إضافية. | `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts`، `apps/api/src/presentation/api/router/StudentSupportAdminRouter.ts` | لا يوجد UI خاص لتشخيص الهوية الغائبة بعد، ولم تُجر اختبارات DB/HTTP تشغيلية. |
| `STU-ADM-019` | P1 | **IMPLEMENTED — SOURCE ONLY** | حصر failureCode المعروض في allowlist مع fallback عام. | `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts` | تحتاج اختبارات على رسائل داخلية غير متوقعة. |
| `STU-ADM-020` | P2 | **IMPLEMENTED — SOURCE ONLY** | استبدال مؤشرات صفحات الدعم والمتابعات بمؤشر HMAC-SHA256 موقّع، ينتهي بعد 15 دقيقة ومرتبط بالبحث والحالة والحد وهوية الطالب للمسار المناسب، مع مقارنة توقيع زمنها ثابت. | `packages/infrastructure/src/students/PrismaStudentWorkspaceRepository.ts` | يلزم ضبط STUDENT_SUPPORT_CURSOR_SECRET ثابت عبر النسخ، أو مفتاح JWT_PRIVATE_KEY_PEM؛ إذا لم يتوفر مفتاح قوي تفشل الصفحات التالية بأمان. |
| `STU-ADM-021` | P2 | **IMPLEMENTED — SOURCE ONLY** | عند conflict في reset يعاد تحميل حالة الطالب ويُطلب تأكيد جديد. | `apps/admin/src/pages/StudentSupportAdminPage.tsx` | لم يُختبر في المتصفح. |
| `STU-ADM-022` | P2 | **IMPLEMENTED — SOURCE ONLY** | إزالة اختيار الطالب السابق عند تبديل query/status أو مسح الفلاتر. | `apps/admin/src/pages/StudentSupportAdminPage.tsx` | لم يُختبر في المتصفح. |
| `STU-ADM-023` | P2 | **PARTIAL — SOURCE ONLY** | ربط واجهة دعم الطلاب بنظام i18n الإداري المعتمد، مع أكثر من 80 مفتاحًا عربيًا/إنجليزيًا للتبويبات والبحث والفرز والأزرار والدورات والشهادات والمتابعات، وتحويل اتجاه الصفحة حسب اللغة، وترجمة حالة الحساب والشهادة. | `apps/admin/src/pages/StudentSupportAdminPage.tsx`، `apps/admin/src/i18n/ar.ts`، `apps/admin/src/i18n/en.ts` | لا تزال بعض الرسائل الديناميكية والإشعارات الدقيقة والتواريخ والعناوين ثابتة بالعربية؛ التحقق في المتصفح وARIA كاملًا غير منفذين. |
| `STU-ADM-024` | P2 | **PARTIAL — SOURCE ONLY** | Added HTTP negative tests for per-owner lazy endpoints, audit failure, triage permission/type and tracker history; source tests for triage cursor category and tracker history IDOR + audit/outbox transaction. | `packages/application/tests/students/StudentWorkspaceOutboxDeliveryGateway.spec.ts`، `packages/application/tests/students/StudentWorkspaceOutboxWorker.spec.ts`، `packages/application/tests/students/StudentApplicationTrackerUseCases.spec.ts`، `apps/api/tests/presentation/api/router/StudentSupportAdminRouter.spec.ts`، `packages/infrastructure/tests/students/PrismaStudentWorkspaceRepository.spec.ts` | Focused TS/lint/Vitest still NOT RUN; do not represent added tests as passing. |
| `STU-ADM-025` | P2 | **IMPLEMENTED — SOURCE ONLY** | Base support detail endpoint now reads P15 only; P13/P14/P20 each have an independent RBAC-checked and REQUIRED-audited owner route. UI fetches each domain on its tab, cancels stale requests and shows loading/errors. | `packages/application/src/students/use-cases/StudentDashboardHydrationService.ts`، `apps/admin/src/pages/StudentSupportAdminPage.tsx` | Browser and HTTP execution remain unverified; P15 base may still compute local projections, but no external owner read. |
| `STU-ADM-026` | P2 | **DEFERRED AFTER SECTION 28** | لا توجد readiness proofs تشغيلية للتكامل، DB، worker، migration، observability. | `docs/reviews/section-15-implementation.md` | حسب تعديل 2026-10-09 لا تشغيل ثقيل حاليًا. |
| `FGA-15-001` | P1 | **PARTIAL — SOURCE ONLY** | Tracker changes now append minimal audit + timeline atomically alongside notification outbox. A student-scoped, purpose-audited, <=30 read API and on-demand UI show tracker history without notes/documents. First 20 events displayed. | `packages/infrastructure/src/students/PrismaStudentApplicationTrackerRepository.ts`، `packages/application/src/students/use-cases/StudentApplicationTrackerUseCases.ts`، `apps/api/src/presentation/api/router/StudentSupportAdminRouter.ts`، `apps/admin/src/pages/StudentSupportAdminPage.tsx`، `apps/api/tests/presentation/api/router/StudentSupportAdminRouter.spec.ts` | History lacks pagination for older events, deleted trackers cannot be opened, and tests were not executed. |
| `FGA-15-002` | P2 | **PARTIAL — SOURCE ONLY** | Server-side P15-only triage supports SYNC_FAILED, SYNC_PENDING, APPLICATION_OVERDUE, signed paginated cursors (<=50), REQUIRED audit, and UI to inspect matching students. No cross-domain query in triage. | `apps/admin/src/pages/StudentSupportAdminPage.tsx`، `apps/api/src/presentation/api/router/StudentSupportAdminRouter.ts`، `packages/application/src/students/use-cases/StudentDashboardHydrationService.ts` | P20 service-request stuck-state triage is not integrated and needs owner-specific grants and bounded contracts; no runtime proof. |

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


## 8. Second continuation — 2026-10-11

**Commits added in this continuation:** `4027f4184887c75de86104a7edd2c83aea5007b0` (bounded owner reads); `47897fc9b024eeb657cf8a5432534859be5b2bc7` (late-role catchup); `5699c6fe1a8f05459ab0696945b33accaf847421` (signed cursors); `c64c32168b6b1f2fcf8a46ce0c9a51298653882d` (cursor tests); `bb95e83e61469bc62cebb8138a19019654ac8932` (owner provenance); `9ac365e9b053153c376f8775c2aa236a8b9f3bf5` (provisioning diagnostics); `e0b61b7e5b053798d1fab9707b3376bf6e63dfd5` (atomic reminder outbox persistence); `b56849666f7914fc20e945ac40b8e64bda8b99e8` (version-bound reminder consumer); `1726713ec6574e5e3650d7b83889db7b27698aaf` (reminder dispatcher runtime wiring); `865153a6236fe2c29f5f8daba35b07426adbcbfa` (application/gateway tests); `4e40acc9324b9c3ae5a6c6f5ec85063177d674ec` (Prisma tracker transaction tests).

### New security/correctness boundaries

- **P13/P14 data are bounded at the owner repository query.** Support reads at most 13 records and presents 12, returning `TRUNCATED` and null counts if more exist. Student dashboard owner reads at most 51 and presents 50, with explicit partial-failure state. A complete count must never be inferred from a bounded sample.
- **Late-role owner catchup** is scoped to the identity just granted student role. It reads via trusted owner gateways with deterministic event ids, but intentionally **refuses to claim completion** when more than 50 records need replay. Add true paginated reconciliation before accepting P1 closure.
- **Signed support cursors** use an expiring HMAC token, filter/limit identity, and constant-time verification; this requires a stable signing secret in each environment. The repository accepts `STUDENT_SUPPORT_CURSOR_SECRET`, falling back to `JWT_PRIVATE_KEY_PEM` if configured; missing/short signing material fails closed on subsequent pages. Secrets never appear in the cursor.
- **Owner-source diagnostics** distinguish source query time from confirmed owner sync time; P13/P14/P20 provenance is only a read-context indicator, not a freshness SLA or owner version.
- **Provisioning diagnosis** is a support-authorization-protected, audited read comparing identity, student role, and P15 workspace; it does not perform recovery or reveal identity contact details.
- **Durable reminder outbox:** the P15 tracker repository now writes `StudentApplicationReminderReconcileRequested` in the exact transaction as create/update/checklist/archive/remove; the worker routes this domain to a dedicated consumer with retry/backoff and version idempotency. `StudentApplicationTrackerUseCases` no longer sends notifications after commits. The consumer checks current owner status/version before creating any notification. Database and notification fault-injection tests are **authored only** and **NOT RUN**.

### Still open before Section 15 closure

1. Run approved **focused** TypeScript / lint and targeted Vitest in a real checkout; no database, E2E or heavy tests were performed, and no result is claimed green.
2. Paginated late-role reconciliation beyond 50 events, historic source replay correctness and real P13/P14 race/revocation checks.
3. P15 reminder worker opt-in, retry/dead-letter operational inspection and observed intent idempotency under transaction failures; runtime assurance is still pending.
4. Complete purpose/case policy and retention controls for support reads; complete P1 freshness/version provenance and strict source envelopes.
5. P2 lazy support tabs, end-to-end admin i18n, server-side triage filters, and signed cursor configuration validation in deployment.
6. Defer full database/worker/E2E assurance `STU-ADM-026` until after Section 28, per the approved closure policy.

**Status: `PARTIALLY IMPLEMENTED — FIXES REQUIRED — NOT CLOSED — RUNTIME PENDING`.**


## 9. Third continuation — 2026-10-11: lazy support, triage, tracker audit/timeline

New branch-only commits: `696946b6fb67b7aa546a3b34567136f3442a6cf4` (lazy owner API/tests), `dda51f94db6da5186102999a5db6a0b33de991c8` (lazy owner UI), `0323874ce47888bef83d53b0a6ad6ee83531e2ef` (stable hook permission dependency), `9e9af914dc0bc6db80e8722037fd2e47e18791f6` (P15 triage repository contracts), `15ce3dba0662a86931daad6b0febe29fd13e4b73` (triage API tests), `a607e3bf11ac22526cf45cba3704cb466f162ed1` (triage UI), `3b8ac4ca2c297e5e5c46708ca6715ce0cdbcac06` (triage cursor tests), `c0fe9ed5592cda97f79878467f6ee42cc0ecac4d` (atomic tracker audit/timeline/history), `fc2110cc7994269b7a2e039b696bae19a48f3f24` (tracker source tests), `0535f57d7b82e4c0e024136d6744bfc9c6802423` (tracker history HTTP API/tests), `8f8e2b2b02251d411293358899c6678ffc7de0b4` (tracker history UI), `19e433d45a66d041ed53766ddce0464883cde47a` (owner status typing correction).

### New findings and owner boundaries

- Base `GET /admin/students/support/:studentReferenceId` now calls `getSupportDetail(studentReferenceId)` without external owner grants. P13/P14/P20 reads occur only on `/support/:studentReferenceId/owner/{learning|certificates|services}`, after **both** base support authorization and **individual owner permission**. Each successful read requires audit **before sending**; audit failures deny the response.
- The Admin page requests owner data only after selecting the corresponding tab. Its selected-student and tab request guards reject stale asynchronous responses. An unstable `hasPermission` function was replaced in effect dependencies with the actual boolean decision to avoid re-fetch loops.
- Triage is a **P15-only** relation query with `integrationInbox` failed/pending and `applicationTrackers` overdue, **not** a services-domain inspector. Explicit kind, signed keyset cursor, limit, minimal rows, and required audit apply. `FGA-15-002` remains partial until P20 service owners expose appropriate scoped triage summaries.
- P15 tracker commands append audit, timeline and reminder outbox facts within **one Prisma transaction**. No copied personal notes, files, or raw private messages are included in those records. Tracker history requires `studentReferenceId`+trackerId ownership and returns only action/status/version/time, with purpose-gated and audited staff API. Existing outbox consumer continues to handle notification retries.
- No changes were made to production DB schemas/migrations, seeds, running workers, main, Section 16, deployment, or merges.

**Remaining release blockers:** focused TS/lint/Vitest could not run in the available environment; do not claim pass. Real DB concurrency and outbox contract verification remain deferred. Late-role catch-up over 50 and source-ordered certificate lifecycle, role recovery quarantines, admin bilingual i18n `STU-ADM-023`, durable operational visibility, support case retention, P20 stuck-service triage, and tracker history older-page pagination are not finished.

**Section 15 remains `PARTIALLY IMPLEMENTED — NOT CLOSED / RUNTIME PENDING`.**


## 10. Fourth continuation — 2026-10-11: Admin AR/EN translation integration

Commits: `b5615f6dfdd750bcec52c5c4414e06bdfe45497c` (first 29 bilingual keys + app locale integration), `acc933db2aadc423e99c138f7b19da9994ef7d3e` (53 additional AR/EN keys covering owner views and tracker operations), `efcecf01d1a9c51e4246d9e9d90580205cc15b90` (English lifecycle/collection labels). The component uses the existing `I18nProvider`; it does not create a second language preference store. The top-level direction follows `dir` from the provider.

Static source inventory finds **82** `stu_support_*` keys in each locale dictionary, with no unresolved `t('stu_support_*')` references at review time. This is a source consistency check, **not a successful TypeScript or browser test**. Some dynamic strings, fallback errors, dates, table descriptions, ARIA labels and operation details remain Arabic and require a separate full translation pass.

**Unchanged closure ruling:** Section 15 is not closed. `STU-ADM-023` moves from OPEN to PARTIAL, and `STU-ADM-026` remains deferred as originally authorized. The source tree was updated only on `codex/section-15-student-support`; tests/TS/DB/worker/browser did not run and no production or main-branch changes were made.
