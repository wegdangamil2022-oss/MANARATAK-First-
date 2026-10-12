# التحقق المستقل للأقسام 01–03 — 2026-10-12

**النتيجة: إصلاحات واختبارات مثبتة ضمن حدودها؛ الأقسام الثلاثة PARTIAL، وليست RUNTIME_VALIDATED أو PRODUCTION_GO.**

- المستودع `wegdangamil2022-oss/MANARATAK-First-`؛ الفرع `codex/review-sections-1-3-20261012`، من آخر `origin/main` بعد clone/fetch: `1d31b847455a762180c65306275e2eadc1bbff43`. أُعيد فحص remote main قبل التسليم ولم يتغير. لا merge ولا نشر.
- workspace كانت خالية من checkout: فحص `/workspace` ثم clone؛ `git status --short --branch` نظيف على main. لا تغييرات محلية/stash مفقودة، ولا تغيير/حذف فروع الدردشات الأخرى. فُحصت `git branch -avv` والفروع البعيدة، وأنشئ الفرع بواسطة `git switch -c codex/review-sections-1-3-20261012 origin/main`.
- لا `AGENTS.md` في checkout أو workspace بعد البحث. قُرئت الخطة والقواعد/سياسة 9 أكتوبر، الأقسام وFG وملحق `01.12 / 02.13 / 02.14 / 02.16 / 03.11 / 03.12 / 03.15`، وتقارير `SECTION_01_IAM_RBAC_IMPLEMENTATION` و`SECTION_02_AUDIT_IMPLEMENTATION` و`SECTION_03_EAP_IMPLEMENTATION / CLOSURE_REGISTER` وأدلتها. أوامر التشغيل الثقيلة في طلب هذه الجولة تتقدم على التأجيل التاريخي؛ لم نُعد الأقسام 24–28.
- **كوميت المصفوفة المُختبر:** `3b7c055ca1d42b9fed245f4787bc7f15ac2ca5db`. **آخر source/test commit:** `7081fb0360751f2c4e106dca4888ceffe1b25000`؛ لا يغير سوى picker وردود eligibility وassertions في browser01، فأعيد typecheck/SSR المتأثر وbrowser01 عليه فقط. باقي الاختبارات نُسبت إلى `3b7c055ca1d42b9fed245f4787bc7f15ac2ca5db` ولم تُعد دون سبب. كوميت الأدلة النهائي docs فقط. تشغيلات التشخيص السابقة، بما فيها browser01 الملغى، ليست أدلة نجاح. بقية محاولات التشخيص كانت على baseline مع working-tree repairs، وليست نسبًا خاطئة إلى كوميت مغلق.
- البيئة الأصلية Node 24.19.0/npm 11.9.0؛ تثبيت `npm ci` نجح وأنتج Prisma فقط. نُفذ التحقق النهائي والتصحيح المتأثر على **Node 22.16.0** المطابق للengine/CI باستخدام `npx --yes --package=node@22.16.0 node ...`؛ إعادة scope 1–3 مبررة بتغيير runtime وإثبات الكوميت النهائي، لا إعادة شاملة للمستودع. TypeScript 5.8.2، Vitest 4.1.11، Chromium محلي، PostgreSQL 16 في Docker جديد.

## تقارير المتطلبات

الأسماء والمعرفات الأصلية مستخرجة من ملف الخطة نفسه؛ لكل متطلب صف مستقل يربط الكود والنتيجة والحدود، مع تصنيف «مكتمل ومثبت / منفذ وغير متحقق / جزئي / غير منفذ». لا تعني حالة متطلب منفرد إغلاق القسم أو كافة اختبارات التشغيل.

- [01 — الموظفون والصلاحيات / IAM & RBAC](SECTION_01_VERIFICATION_2026-10-12.md): 16 متطلبًا أصليًا + FGA-01-001، وPatch G غير المرقم.
- [02 — سجل التدقيق / Enterprise Audit Center](SECTION_02_VERIFICATION_2026-10-12.md): 20 متطلبًا أصليًا + FGA-02-001/002.
- [03 — الأصول والملفات / Enterprise Asset Platform](SECTION_03_VERIFICATION_2026-10-12.md): 23 متطلبًا أصليًا + FGA-03-001/002، وسجل القدرات Patch J.

## الإصلاحات المؤكدة

1. **سباق إسناد الدور:** كشف PG فشل unique pair عند طلبين متزامنين. قفل assignment ID/pair وrole reference داخل owner transaction ثم فحص immutability/replay؛ نتيجة بمعرّف محفوظ واحد، success audit وOutbox واحدة. writer بلا capability يفشل مغلقًا؛ 503 typed capability mapping. تعارض ID مع زوج مختلف مرفوض.
2. **عدم إعادة تقييم الاحتفاظ:** قرار `SKIPPED` كان يحجب السجل بعد انتهاء hold. أصبح APPLIED فقط terminal؛ skip evidence محفوظة/مزالة التكرار، ونقل terminalKey القديم إلى APPLIED ذريًا بلا backfill. `listDue` تستبعد active hold حتى لا يستنزف أول batch، مع ordering ثابت. write-time hold/lease guards بقيت مطبقة.
3. **اكتمال لغة مركز الأصول:** نقل النصوص الثابتة في Library/Details/Governance/Upload/Actions/Picker إلى AR/EN، وتصحيح LTR وتنسيق تاريخ Governance بحسب اللغة، مع regressions مصدرية وChromium English/mobile.
4. **اختبارات EAP المؤجلة:** صار rehearsal المحلي خيارًا صريحًا بURL ثابت، دون توسيع قبول عناوين remote أو تعديل installer CI. صُححت ثلاثة fixtures CMS قديمة بإضافة `lastModifiedBy` المطلوب وأزيل import مكرر. لم تُخفض assertions الأمنية. كما صُححت وثيقتا تشغيل EAP اللتان بقيتا تصفان archive compensation/retry القديم خلافًا للبروتوكول الحالي؛ لم يتغير سلوك المصدر في هذا التصحيح التوثيقي.

## سلامة قاعدة الاختبار والمزودات

عُرضت تجهيزات الحاوية وأوامر schema/guard SQL في commentary قبل التنفيذ. الحاوية **جديدة** `manaratak-review-123-db`، والمنفذ loopback 55432، والقاعدة `manaratak_eap_ci_test`. لا volumes لبيانات قائمة ولا credentials runtime؛ القيم التالية بيانات تجريبية ثابتة. قبل constructing Prisma يرفض installer/suite أي URL أو flags مختلفة.

```bash
docker --host=unix:///var/run/docker.sock run -d --name manaratak-review-123-db \
  -p 127.0.0.1:55432:5432 \
  -e POSTGRES_USER=eap_ci -e POSTGRES_PASSWORD=eap_ci_disposable_only \
  -e POSTGRES_DB=manaratak_eap_ci_test postgres:16
export DATABASE_URL='postgresql://eap_ci:eap_ci_disposable_only@127.0.0.1:55432/manaratak_eap_ci_test?schema=public'
export DIRECT_URL="$DATABASE_URL"
export DATABASE_MUTATIONS_ALLOWED=true RUN_DATABASE_INTEGRATION_TESTS=true
export EAP_EPHEMERAL_DB_TESTS=true EAP_LOCAL_DISPOSABLE_DB_TESTS=true
npx --no-install prisma db push --schema=packages/infrastructure/prisma/schema.prisma --skip-generate
node tests/e2e/sections123/install-guards.mjs
```

المُثبّت GitHub-only الأصلي رفض port/context المحلي قبل أي mutation؛ [دليل الرفض](evidence/sections-01-03-20261012/disposable-eap-guards.log). أُبقي كما هو، وعُرض أمر scoped local installer قبل استخدامه. [schema result](evidence/sections-01-03-20261012/disposable-schema.log) و[ترحيلات الحواجز الثلاثة في القاعدة الجديدة فقط](evidence/sections-01-03-20261012/disposable-eap-guards-local.log). **هذا schema push + ثلاث migrations لحواجز EAP، وليس migrate deploy لسلسلة كاملة أو target rollout أو parity/backfill rehearsal.** لم تُعدّل schema/migration sources أو قاعدة قائمة/إنتاج.

Provider calls في الاختبارات mock/injected fixtures. Browser HTTP يُحاكى بالكامل وكل host غير 127.0.0.1 يُرفض؛ لا إشعارات/رسائل/مدفوعات/مزود حقيقي ولا purge خارجي. Chromium يشغّل واجهة فعلية مع dev CSP bypass معلن؛ ليست deployed CSP acceptance أو مصادقة كاملة. نتائج PG فعلية لكن provider failures مُحقنة، لا object-store/CDN outage حقيقي.

## النتائج النهائية والكوميت المختبر لكل نطاق

| الفحص | النتيجة | الدليل |
|---|---|---|
| القسم 01 unit/contract/security/UI SSR | 118 PASS /23 files | [log](evidence/sections-01-03-20261012/final-node22-section01.log) |
| القسم 02 unit/contract/security/UI SSR | 103 PASS /16 files | [log](evidence/sections-01-03-20261012/final-node22-section02.log) |
| القسم 03 source/API/Domain/Infrastructure/UI SSR | 300 PASS /27 files؛ 39 DB cases skipped في هذا المسار فقط | [log](evidence/sections-01-03-20261012/final-node22-section03.log) |
| PG جديد: IAM 8 + Audit 4 + Asset volume 1 | 13 PASS /3 files؛ لا skipped | [log](evidence/sections-01-03-20261012/final-node22-postgres-new.log) |
| EAP PG الموجود: CAS/restore/archive/purge/reference races | 39 PASS /2 files؛ لا skipped | [log](evidence/sections-01-03-20261012/final-node22-postgres-eap.log) |
| حواجز audit/assets/owner وretention المشتركة | 38 PASS؛ لا skipped | [log](evidence/sections-01-03-20261012/final-node22-guards.log) |
| Chromium IAM AR/EN | PASS على `7081fb03`؛ HTTP intercepted؛ النتيجة السابقة INVALIDATED | [log](evidence/sections-01-03-20261012/final-node22-browser01.log) |
| Chromium Audit AR/EN/filter/export | PASS؛ HTTP intercepted | [log](evidence/sections-01-03-20261012/final-node22-browser02.log) |
| Chromium EAP AR/actions/filter/retry | PASS؛ HTTP intercepted | [log](evidence/sections-01-03-20261012/final-node22-browser03-ar.log) |
| Chromium EAP EN/mobile/details/filter | PASS؛ HTTP intercepted | [log](evidence/sections-01-03-20261012/final-node22-browser03-en-mobile.log) |
| picker correction SSR + typecheck | PASS على `7081fb03`؛ اختبارات متأثرة فقط | [SSR](evidence/sections-01-03-20261012/final-node22-picker-regression.log)، [compile](evidence/sections-01-03-20261012/final-node22-picker-typecheck.log) |
| tsc -b كامل + tsc منفصل للDB suite | PASS /exit 0 | [projects](evidence/sections-01-03-20261012/final-node22-typecheck.log)، [DB tests](evidence/sections-01-03-20261012/final-node22-db-tests-typecheck.log) |
| source-quality | PASS؛ 0 cycles /0 a11y findings | [log](evidence/sections-01-03-20261012/final-node22-quality.log) |
| lint الملفات المعدلة المحددة | 0 errors /19 warnings، منها ملف mts ignored؛ ليس repo-wide lint | [log](evidence/sections-01-03-20261012/final-lint.log) |
| secrets scan + git diff/staged check | PASS؛ signatures فقط وليست ضمان كشف كل سر | [secrets](evidence/sections-01-03-20261012/final-secret-scan.log)، [diff](evidence/sections-01-03-20261012/final-diff-check.log) |
| AST admin audit coverage | PASS؛ 404 handlers /403 unique endpoints؛ لا إثبات owner validation/atomicity شامل | [log](evidence/sections-01-03-20261012/audit-coverage.log) |

**لا جمع لمحاولات الإعادة ولا عدّ skipped كنجاح.** الـ39 المتجاوزة في unit اجتازت مسار DB مستقل. لم تُشغل `verify:local` أو all-repository test/E2E أو اختبارات الأقسام 24–28. التحقق البنيوي المشترك وowner asset/retention regressions ضروران للمكونات المشتركة المعدلة. لا ندعي remote CI من local results.

## أوامر التشغيل المسجلة

المسارات أدناه كما استُخدمت؛ السجلات والتوقيت من التشغيل النهائي. prefix النهائي هو:

```bash
npx --yes --package=node@22.16.0 node
```

المجموعات unit/contract:

```bash
node_modules/vitest/vitest.mjs run \
  packages/application/tests/authorization packages/application/tests/identity \
  packages/infrastructure/tests/authorization packages/infrastructure/tests/identity \
  packages/shared/tests/authorization \
  apps/api/tests/presentation/api/router/AuthorizationControlPlane.spec.ts \
  apps/api/tests/presentation/api/router/AuthorizationDelegation.spec.ts \
  apps/api/tests/presentation/api/router/AuthorizationAdminRouter.spec.ts \
  apps/api/tests/presentation/security/RuntimeRbacAuthority.spec.ts \
  apps/api/tests/presentation/validation/IdentityListQuery.spec.ts \
  apps/admin/src/pages/AuthorizationAdminPage.spec.tsx apps/admin/src/pages/IdentityAdminPage.spec.tsx

node_modules/vitest/vitest.mjs run \
  packages/application/tests/audit packages/infrastructure/tests/audit \
  apps/api/tests/audit apps/api/tests/presentation/audit \
  apps/admin/src/pages/AuditCenterPage.spec.tsx apps/admin/src/pages/audit/AuditViewModel.spec.ts

node_modules/vitest/vitest.mjs run --config vitest.config.ts \
  packages/domain/tests/asset-platform packages/application/tests/asset-platform \
  packages/infrastructure/tests/asset-platform \
  apps/api/tests/presentation/api/router/AssetReuseRouter.spec.ts \
  apps/api/tests/presentation/api/router/AssetUsageImpact.spec.ts \
  apps/api/tests/presentation/api/router/AssetPlatformErrorContract.spec.ts \
  apps/api/tests/presentation/api/router/AssetFinalizationContract.spec.ts \
  apps/api/tests/presentation/api/router/AssetPlatformRouter.spec.ts \
  apps/admin/src/components/AssetLifecycleActions.spec.tsx apps/admin/src/pages/AssetAdminPage.spec.tsx \
  packages/config/tests/AppConfig.spec.ts apps/api/tests/runtime-dependency-bootstrap.spec.ts
```

بعد تمرير env المحلي أعلاه، قواعد البيانات:

```bash
export SECTION123_EVIDENCE_DIR="$PWD/docs/reviews/evidence/sections-01-03-20261012"
node_modules/vitest/vitest.mjs run --config tests/e2e/sections123/vitest.config.mts
node_modules/vitest/vitest.mjs run --config vitest.config.ts \
  packages/infrastructure/tests/asset-platform/PrismaAssetPostgres.database.spec.ts \
  packages/infrastructure/tests/asset-platform/PrismaAssetReferenceSerialization.database.spec.ts
```

Browser/HMR والدفاعات المشتركة:

```bash
DISABLE_HMR=true npx --no-install vite --config apps/admin/vite.config.ts --host 127.0.0.1 --port 3013 --strictPort
# لكل سطر node أدناه استُخدم prefix Node 22 النهائي:
node tests/e2e/sections123/section01.browser.mjs
node --import tsx tests/e2e/sections123/section02.browser.mjs
node tests/e2e/section03-admin-isolated.mjs
node tests/e2e/sections123/section03.browser.mjs
node --import tsx --test tests/security/admin-audit-coverage.test.mjs \
  tests/security/audit-integrity-remediation-source.test.mjs \
  tests/remediation/w2-asset-reference-integrity.test.mjs \
  tests/remediation/w3-asset-provider.test.mjs \
  tests/remediation/w4-admin-asset-course-control-plane.test.mjs \
  tests/remediation/w2-services-career-owner-scope.test.mjs \
  tests/remediation/w2-retention-lifecycle.test.mjs
node node_modules/typescript/bin/tsc -b
node node_modules/typescript/bin/tsc -p tests/e2e/sections123/tsconfig.json
node scripts/quality/verify-source-quality.mjs
npm run audit:coverage:verify
```

الlint المحدد استعمل `npx --no-install eslint` على ملفات IAM/retention/assets المعدلة وnegative tests و`tests/e2e/sections123/*.ts *.mts` فقط؛ الأمر والقائمة محفوظان في [commands.json](evidence/sections-01-03-20261012/commands.json). `npm run security:secrets` و`git diff --check` ضمن فحص التسليم؛ الأدلة منفصلة. لم يُشغل build bundle/production artifact؛ `tsc -b` compilation لا يساوي deployed frontend build acceptance.

## الإخفاقات ومحاولات الإصلاح

| المحاولة | السبب والقرار | الإثبات اللاحق |
|---|---|---|
| أول PG IAM | fixture identity دون Account؛ أصلحت fixture قبل استنتاج خلل الكود | الاختبار المتأثر فقط أعيد |
| PG assignment race | P2002 pair concurrency؛ أصلح owner transaction/replay | pg01 النهائي PASS؛ 1 audit +1 outbox |
| أول rerun assignment | compilation سابقة فقدت return في تعديل مؤقت؛ صُحح المصدر وأعيد tsc قبل rerun | final typecheck وpg01 PASS |
| أول PG Audit | accessor fixture استعمل id.value بدل getId/getValue؛ صُحح دون تغيير شروط gaps/duplicate | JSON/volume cases PASS |
| PG legal-hold retry | SKIPPED terminal فعلي؛ أصلح repository والqueue وhistorical-key transfer | pg02 النهائي PASS |
| تدقيق IAM browser النهائي | كان harness لا يرصد caught React errors؛ fixture خاطئة أدت إلى hidden component crash مع PASS زائف. **سُحبت النتيجة القديمة**، صُححت fixture، شُدد console/render assertion ورفض picker malformed replies | browser01 على7081fb03 PASS مع negative local-error case؛ سجل INVALIDATED محفوظ |
| أول Chromium IAM | selector Next طابق paging الدور وStaff؛ حُصر Staff button، وwaiter يجري قبل click | browser01 النهائي PASS |
| أول Chromium Audit | fixture reference ليست عمودًا في جدول النتائج؛ اختير action المرئي | browser02 النهائي PASS دون تعديل المنتج |
| أول Chromium EAP | dev HMR يحاول WebSocket على443؛ DISABLE_HMR=true في isolated server | browser03 النهائي PASS؛ deployed CSP/HMR لا يُدعى |
| installer CI/ref suite | deliberately refused local55432؛ local guarded installer/opt-in بدل spoof GITHUB_ACTIONS | guards installation و39 PG PASS |
| 3 EAP reference cases | fixtures CMS قديمة دون lastModifiedBy؛ أضيف required actor، لم تُخفف assertions | الحالات الثلاث PASS ثم scope PG النهائي39 PASS |
| W3 provider node:test | native Node24 require TS extensionless imports فشل؛ أضيف `--import tsx` عند التشغيل، ثم Node22 نفسه | provider3 والحواجز38 PASS |
| PG immutable-ID test | Human fixture دون User؛ أضيف User/verified synthetic contact وبقيم enum الصحيحة | pg01 النهائي8 PASS |

بقيت سجلات التشخيص القديمة في الأدلة، ولا تستخدم لإعلان نجاح snapshot لم يُختبر. كل إعادة scoped بعد سبب معلوم؛ التشغيل النهائي المحدود بالأقسام الثلاثة على Node22 بسبب runtime/commit change.

## الأداء التجريبي

- [Audit metrics/EXPLAIN](evidence/sections-01-03-20261012/section02-volume.json): 100000 سجل، 2000 نتيجة/20 دفعة cursor، بلا duplicates/gaps؛ نحو 213ms لمسار التصدير مع EXPLAIN/integrity اللاحق ضمن نافذة القياس، وإعداد+تحقق نحو4.5s.
- [Asset metrics/EXPLAIN](evidence/sections-01-03-20261012/section03-volume.json): 10000 أصل، 5000 نتيجة/50 دفعة q+cursor، نحو1.36s بما فيه sample usages/explain؛ usage sample ثلاثة IDs نحو84ms. **هذا ليس قياس registry على owners مليئة أو SLA/soak/cold cache للإنتاج.**
- `ANALYZE`/EXPLAIN والكتابات كانت في القاعدة الجديدة فقط. لا migrations indexes اختيرت عشوائيًا من الأرقام.

## الاختبارات المؤجلة المتبقية وحكمها

| مرجع الخطة | المنفذ في هذه الجولة | المتبقي/العائق — ليس PASS |
|---|---|---|
| 01.12 Navigation/UI | Chromium AR/EN/route split/cursor + SSR/owner contracts | كامل staff create/update/lifecycle، chooser/maker-checker/unsaved changes في browser→real API/session/DB، mobile/a11y لجميع التبويبات |
| 01.12 Delegation/Role/Policy/Emergency/Audit | negative API contracts؛ PG NFKC/CAS/immutable replay/rollback/101-role usage/dangling+retired/IP/expiry/revoke | credential/session eligibility وTIME contexts عبر جلسة حقيقية، policy attach/retire transaction race كاملة، durable denied audit أثناء تعطل المالك |
| 02.13/02.14 | unit/contract/query/cursor/date/export/privacy/source/correlation/retention/UI؛ JSON PG؛ bounded integrity | جرد owner validations/atomicity لكل mutation، full correlation timeline/deep links على APIs فعلية، owner privacy approval |
| 02.16 PG/volume/export/retention | actual rollback writes،100k ledger/EXPLAIN/2000 export، concurrent archival/live+expired leases/historical skip/hold expiry | process-kill worker crash + restart/soak متعدد replicas، cardinalities شبيهة بالإنتاج، approved retention policy، external tamper-evidence architecture |
| 03.11/03.12 | security lifecycle/reuse/query/contracts+UI، actual CAS/leases/reference races/archive/restore/purge،10k library benchmark | Course/StudyDestination browser→owner-save→public render الكامل، كل chooser/preview/ingestion flow بمزود اختبار فعلي |
| 03.15 Providers | adapters/local gateway + injected failure contracts فقط | isolated scanner EICAR/clean، EXIF sanitizer، immutable object checksum/signature، grant retries، CDN/cache/expiry، provider-side fencing/reconciliation: لا isolated configured provider fixtures متاحة، والمزودات الحقيقية ممنوعة في طلب المستخدم |
| 03.15 Data/runtime | schema وحواجز SQL و39 PG cases؛ benchmark محدود | migration chain/backfill/target rollout، legacy operation quiescence، realistic populated usage registry، live outbox/recovery/retention-worker/provider deployment |
| FGA/Patch G/J | كشفها وتصنيفها وربط اعتمادياتها بالكود | SoD/MFA/JIT/access reviews؛ Case/Alerts؛ rights/renditions/OCR/media pipeline: غير منفذة أو governance/provider-dependent، لا إغلاق ضمني |

لا الادعاء بإغلاق القسم أو نجاح كل acceptance، ولا DB/Provider/Runtime/Release GO. عوائق العقود/الحوكمة موثقة بدل تخمين سياسات أو توليد features وهمية. الاختبارات الممكنة اكتملت، والأدلة المتعذرة واضحة. تعليمات إعادة التحقق: [scoped harness README](../../tests/e2e/sections123/README.md).
