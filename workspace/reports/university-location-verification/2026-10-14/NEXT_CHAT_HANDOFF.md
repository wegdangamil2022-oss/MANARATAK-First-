> Historical snapshot. Latest applied workbook batch: `workspace/reports/university-location-workbook/2026-10-14-batch12/README.md` (104 more bindings, 170 held). User directed the integrated update to main.

# تسليم للدردشة التالية — 2026-10-14

طلب المستخدم نقل التغييرات فورًا إلى `codex/city-region-source-reconciliation-20261013` لتكمل الدردشة الجديدة. ابدأ من آخر نسخة لهذا الفرع. أساس هذه الدفعة هو main عند `4e203a88ac766a5da6af3e726fe7f6547c531ae0`؛ الفرع الهدف سيتقدم دون حذف تاريخه.

تم البحث في الجامعات الـ342 المتبقية بواسطة 780 استعلامًا، وتثبيت 68 ربطًا بعناوين مصادر أولية: 39 مقتطفًا مؤكدًا بجلب HTTP مباشر، و29 مقتطفًا من فهرس البحث مع تمييز هذا القيد. أضيفت 36 مدينة. العدد الحالي 10,723 جامعة: 10,449 مرتبطة بالمصدر و274 للمراجعة؛ المدن 10,610، المناطق 5,003، الدول 194. لا تعتبر هذا تحققًا نهائيًا لكل المدن والمناطق أو جميع فروع الجامعات.

ابدأ من `remaining-university-review.csv` في هذا المجلد. الأدلة والقرارات والنطاقات محفوظة في `reviewed-decisions.json` و`source-evidence.jsonl`، وكل تغطية البحث في `research-coverage.jsonl`. تفاصيل التعديلات قبل/بعد في `applied-university-changes.jsonl` وسلسلة الإيصالات في `workspace/reports/geography-research-restoration/2026-10-13/`.

المتبقي يتطلب التحقق من هوية المؤسسة وعنوانها الحالي والمنطقة الصحيحة، وليس تخمين أقرب مدينة. انتبه خصوصًا إلى تناقضات حقول القرية/الناحية في السجل الإندونيسي؛ أسماء جامعات اليابان المتشابهة أو التاريخية؛ جامعات كوسوفو الثماني التي لا يوجد لها XKX في سجل الدول؛ الأقاليم الفرنسية وراء البحار؛ تقسيمات إثيوبيا الحالية مقابل SNNPR القديمة؛ تعارض عنوان جامعة East Capital؛ وتعارض Guildford المتبقي. لا تربطها ببلد أو منطقة بديلة لمجرد استكمال العدد.

الربط الخاص بـPUCMM يستخدم مدينة Santiago القائمة تحت DO-25. Lerma التابعة لجامعة Campeche هي MX-CAM، وSan Carlos هي PH-PAN؛ بعض عناوين طوكيو إدارية ولا تمثل جميع الحرم. تفاصيل ذلك محفوظة في نطاق كل قرار.

للتحقق بعد تغييرات جديدة:

```bash
python scripts/verify-geography-research-restoration.py
python scripts/tests/verify-geography-research-restoration.test.py
npm run imports:qc:prepare
npm run imports:qc:verify
npx vitest run tests/import-sources/SourceQuality.spec.ts tests/import-sources/SourceQualityPreparation.spec.ts tests/import-sources/UniversityCityRegionScope.spec.ts packages/application/tests/courses/CourseSourcePublicationGate.spec.ts
```

قد يلزم بناء الحزم المحلية أولًا: `npx tsc -b packages/shared packages/domain packages/application`. هذه الجلسة تستخدم Node 24.19.0؛ إصدار المشروع المطلوب Node 22 لم يُختبر. لا توجد عمليات قاعدة بيانات أو استيراد فعلي أو نشر في هذه الدفعة. راجع validation.json لمعرفة النتائج الفعلية.
