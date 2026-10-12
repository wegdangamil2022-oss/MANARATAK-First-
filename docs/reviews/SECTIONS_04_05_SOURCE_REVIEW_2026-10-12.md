# تسليم مراجعة المصدر للقسمين 04 و05

> تحديث الاستكمال: النواقص الثلاثة للقسم 04 في هذا التقرير التاريخي نُفذت بالمصدر في `6a789689`. انظر [تقرير الاستكمال وأدلته وحدوده](SECTION_04_GOVERNANCE_COMPLETION_2026-10-12.md). نتائج هذه المراجعة القديمة لا تتحول إلى اختبارات للكود الجديد.


تم دمج الدفعة السابقة ورفع main عند `3a00176a`. فرع المراجعة الجديدة: `codex/review-sections-4-5-source-20261012`، كوميت المصدر `8fb0fe6d`.

- [القسم 04 — الإعدادات العامة](SECTION_04_SOURCE_REVIEW_2026-10-12.md).
- [القسم 05 — بنية الاستيراد](SECTION_05_SOURCE_REVIEW_2026-10-12.md).

## الفحوص المنفذة مرة واحدة

1. `npx vitest run packages/infrastructure/tests/settings/SettingsPersistedConstraintBoundary.spec.ts`: PASS، ملف جديد واحد وحالتان (1.28 ثانية)، منع قواعد max/maxLength قبل أي كتابة؛ قاعدة البيانات mock فقط. [السجل](evidence/sections-04-05-source-review-20261012/constraint-once.log).
2. `npx tsc -b packages/infrastructure apps/admin --pretty false`: PASS، exit 0. [السجل](evidence/sections-04-05-source-review-20261012/typecheck-once.log).

شُغلت الأوامر على شجرة عمل فوق `3a00176a` قبل الكوميت، ولم تُعد. مصدر المستودع والاختبار مطابق لـ`8fb0fe6d`؛ إضافة metadata/truncation في Settings UI جاءت **بعد** فحص TypeScript، ولم تُفحص مجددًا. لا يُدّعى نجاح فحص جميع ملفات الكوميت النهائي. بصمات ملفات الاختبار المستهدف:

- `packages/infrastructure/src/settings/PrismaSettingAssignmentRepository.ts`: `c8ca030ed88c9afd22b3976db7225110f5fd8c4eef9bb4a230a39e7e8ab71b6b`
- `packages/infrastructure/tests/settings/SettingsPersistedConstraintBoundary.spec.ts`: `566f9180738466b708b164c98471aaa4b5c46b76bbd2064b16d5a5b642bd70b0`

## الإصلاحات

- 04.6: تحميل قواعد التعريف المحفوظة في إعادة التحقق داخل معاملة حفظ الإعداد؛ Application validation وحده لا يغطي direct repository callers.
- 04.15: معلومات revision/validation summary وassignment count/flag state عند الطلب؛ عرض القيم الطويلة محدود، دون اختلاق consumer أو last editor.
- FGA-05-002: عرض تفاصيل الفروق وصفحاتها من API الموجود بدل عدادات فقط؛ scope/read-only/version pins باقية.
- FGA-05-001: تصفير حقول mapping القديمة وسببها عند تغيير سياق المصدر.

## ما بقي

- **نواقص مصدر مؤكدة في 04:** change-set متعدد المفاتيح ذريًا (FGA-04-001)، وقواعد اتساق effective cross-key (FGA-04-002)، وحقول consumer/last editor الحقيقية في 04.15. لا يعتبر جردها تنفيذًا لها أو يجعلها مجرد اختبار تشغيل مؤجل.
- **05:** المسارات المدعومة وميزات FGA موجودة بالمصدر؛ إثبات التشغيل النهائي مؤجل. XML/XLSX/crawl-delay وبعض المستهلكين المستقبلية غير مدعومة ومعلنة، وليست claims نجاح.
- إعداد المستهلكين الفعليين والأسرار وsigned source approval، وتطبيق ترحيلات Settings/Import على قاعدة معزولة، وworkers/browser/provider/load تبقى منفصلة ومؤجلة. لا database migration أو production mutation أو real notification/payment/network-source acquisition حدثت.

التقارير القديمة محفوظة كسجل تاريخي. الدفعة الجديدة تُرفع للفرع المستقل ولا تدمج تلقائيًا في main. عناوين الكوميتات تحمل `[skip ci]` لمنع إعادة الفحوص آليًا في هذه الجولة، دون تغيير workflows.
