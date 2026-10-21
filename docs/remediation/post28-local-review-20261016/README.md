# تسوية R04 المحلية — مقترح مراجعة، غير مطبق

المصدر الذي أعاد 109 ترحيلات: `17c02c3266bbad3d9989ef1fc956379215c7a251`. مصدر إصلاح منح التطبيق اللاحق: `95c0888161badd9efe47cecb4a732d35f39fc1ca`. ملفات schema وسلسلة migrations الأصلية لم تتغير بين النسختين؛ لذلك لم تُكرر التجربة التي فشلت بنفس schema. لا ملف هنا جزء من سلسلة Prisma migrations أو تصريح تنفيذ SQL.

## الدليل والسبب

بعد replay حقيقي على DB-G جديدة، خرج فحص `replayed` برمز 2. [الفروق المقاسة](../../reviews/evidence/post28/17c02c3266bbad3d9989ef1fc956379215c7a251/local-validation/schema-drift-review.txt) تخص 18 جدولًا: قيمتين افتراضيتين، 11 فهرسًا غير ممثل في datamodel ، 8 FKs غير ممثلة، 6 علاقات تختلف فيها referential actions ،و 4 أسماء فهارس. عبارات Removed/Add في تقرير Prisma تصف الفرق المقترح؛ **لم تُحذف هذه الكائنات من القاعدة**.

الـ catalog الفعلي:281 جدول تطبيق، 313 FK ، 102 CHECK ، 35 UNIQUE ، 282 PK مع ledger ، 1191 index صالحًا و 40 user trigger. فُحصت كل 313 FK و 7 CHECK غير متحققة:320 قراءة بلا مخالفة. بقي 9 NOT VALID فعلًا،بما فيها FK ثانية لـ SettingAssignmentRecord ؛ لا يحول غياب الأيتام هذه القيود إلى validated=true.

## ترتيب التسوية المقترح

1. راجع المصدر/المالك قبل اعتماد اتجاه المطابقة: المقترح يحافظ على حماية SQL الحالية، ولا يزيل FK أو index ليجعل Prisma يمر. لا يحسم DEC-01…07 أو عقد أعمال غير معتمد.
2. راجع [schema patch](schema-reconciliation.REVIEW.md):
   - تمثيل 8 FKs موجودة أصلًا: InternationalTestEvidenceHistory.testId ، InternationalTestGovernance.testId ، InternationalTestPublicationSnapshot.id/testId ، MajorPublicationSnapshot.majorId/profileId/versionId ، NewMajorCandidateDecision.majorId. تضيف العلاقات العكسية اللازمة لـ Prisma ولا تنشئ بيانات.
   - الحفاظ على 10 GIN/trigram indexes في CMS و index موظف الخدمة،بـ`ops: raw("gin_trgm_ops")` و map مطابق للأسماء الفعلية.
   - تثبيت onUpdate:NoAction لست علاقات NotificationChannelDelivery/NotificationRateReservation و UniversityProgramIntake/StudyLanguage/StudyProfile ،وفق SQL الحالي. إذا اختار المالك مرجعًا آخر يلزم ترحيل مراجع؛ لا تغيير صامت للسياسة.
   - تثبيت map للأسماء الموجودة في OwnerTranslationTransferReceipt و StudentSupportOwnerReadObservation و UniversityProgramIntake و UniversityProgramStudyLanguage ،بدل إعادة تسمية/حذف فهارس تعمل بالفعل.
3. راجع [default reconciliation](metadata-reconciliation.REVIEW.sql):إجراءان فقط،يجعلان CmsBlockSchema.status افتراضيًا DRAFT ويزيلان default updatedAt من CertificateAuthorityDelegation ،**بشرط اعتماد قيم datamodel الحالية كمرجع**. لا تعديل لصفوف status القائمة. بعد الاعتماد تنقل إلى ترحيل جديد إضافي بملكية ومراجعة واضحتين؛ لا تحرير تاريخي.
4. على مختبر جديد مرتبط بـ SHA الجديد،أعد replay و catalog/orphan audits. راجع [validation draft](constraint-validation.REVIEW.sql) للقيود التسعة بالأسماء. لا تطبقه على هدف آخر أو اعتمادًا على أرقام الجولة القديمة،ولا تستعمل VALIDATE لإخفاء بيانات غير صالحة. أي مخالفة تحتاج إصلاح مالك صريح،دون حذف/تخمين روابط.
5. بعد القبول فقط شغّل فحص schema و migration-directory diff والـ shadow ،ثم deploy الثاني ومقارنة ledger بايتيًا و seed required-only وفق بواباته. DB-T مستقلة بأدوار/marker/OID/run جديد،ولا تُنشأ كبديل عن G/S قبل جاهزية شروط R04/R05.

## ما تحقق من المقترح وما لم يتحقق

أُنشئت نسخة schema مرشحة **خارج Git** وطبّق عليها الـ patch خارج المصدر،ثم اجتازت Prisma5.22 `validate` بالرمز 0 على Node22. نجح `git apply --check` على schema الأصلية. الـ patch نفسه محفوظ للمراجعة؛ لم يطبق على schema المعتمدة،ولم يولد client جديد منه،ولم يُنفذ SQL المقترح أو build/typescript/runtime acceptance له. صلاحية syntax ليست إثبات parity أو توافق عملاء سابقين.

تظل R04 BLOCKED حتى اعتماد التسوية وتنفيذها على مرشح ومختبر جديدين مع الأدلة المطلوبة. لا db push أو migrate reset أو استثناء عام من فاحص NOT VALID. لا تغيير في Neon أو الإنتاج.
