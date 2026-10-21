# هدف النسخ والتعافي — AWS

اختار مدير المشروع المفوض AWS هدفًا تقنيًا للتجهيز بعد إفادة المالك بعدم وجود مزود معتمد. هذا قرار تصميم، ولا ينشئ حسابًا أو موارد أو فاتورة أو نشرًا. [الملف القابل للقراءة آليًا](../../config/recovery/aws-review-target.json) يسجل `DESIGN_SELECTED_NOT_PROVISIONED` وجميع حالات التحقق الفعلي false. تبقى ضوابط العقد الأصلي مطلوبة قبل الإنتاج؛ لا يخففها نجاح المختبر المحلي.

## ما سيُجهز

- الحزم الفعلية على Linux x64 / Node22، وRDS PostgreSQL16 داخل شبكة خاصة ودون نقطة DB عامة.
- نسخ RDS آلية لمدة 35 يومًا، تشمل نافذة PITR المطلوبة 30 يومًا، ونسخ آلي إلى منطقة أخرى. يدعم RDS احتفاظًا يصل إلى 35 يومًا؛ لا تكفي قيمة الإعداد لإثبات تغطية 30 يومًا منذ أول يوم تشغيل. [وثيقة RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html)، [نسخ المناطق](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/AutomatedBackups.Replicating.Enable.html).
- S3 بإصدارات للملفات ومنع وصول عام، ونسخة احتياطية في حساب ومنطقة منفصلين بمفتاح KMS خاص بالنسخ. تُضبط Object Lock على نسخة الحفظ وبمدد الاحتفاظ المطلوبة، دون تطبيق احتفاظ دائم أو Legal Hold على جميع ملفات الطلاب. تمنع سياسة الأدوار التطبيق من حذف النسخ. [Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html)، [تكرار الملفات المشفرة](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-config-for-kms-objects.html).
- نسخة RDS غير قابلة للحذف خلال الاحتفاظ في AWS Backup vault محمي، ونسخ يومية 35 يومًا و12 أسبوعية، مع CloudTrail وتسجيل أحداث الوصول إلى كائنات S3. لا يعادل RDS automated backup وحده إثبات WORM في حساب منفصل.

لم تُختر مناطق تخزين أو أحجام مدفوعة افتراضيًا. يحتاج التفعيل حسابًا وميزانية ومراجعة إقامة البيانات، ثم اختيار منطقتين تدعمان الخدمات. لا يوجد حساب AWS متصل في هذه الدفعة. لا اتصال بـNeon ولا إنشاء مورد خارجي.

## أدلة الإغلاق المطلوبة من الحساب الفعلي

يجمع مسؤول التشغيل مخرجات JSON للقراءة فقط، دون كلمات مرور أو روابط موقعة أو أسرار. يحتفظ بالأصول في مخزن أدلة محمي، وينشر نسخة منقحة مربوطة بالحساب والمنطقة ووقت الفحص وSHA. هذه أوامر فحص لموارد معلومة بعد تجهيزها، وليست خطوات إنشاء:

```sh
aws rds describe-db-instances --db-instance-identifier "$RDS_INSTANCE" --region "$PRIMARY_REGION"
aws rds describe-db-instance-automated-backups --db-instance-identifier "$RDS_INSTANCE" --region "$PRIMARY_REGION"
aws rds describe-db-instance-automated-backups --region "$BACKUP_REGION"
aws s3api get-bucket-versioning --bucket "$ASSET_BUCKET"
aws s3api get-public-access-block --bucket "$ASSET_BUCKET"
aws s3api get-bucket-encryption --bucket "$BACKUP_BUCKET"
aws s3api get-object-lock-configuration --bucket "$BACKUP_BUCKET"
aws s3api get-bucket-replication --bucket "$ASSET_BUCKET"
aws backup describe-backup-vault --backup-vault-name "$BACKUP_VAULT" --region "$BACKUP_REGION"
aws kms describe-key --key-id "$BACKUP_KMS_KEY" --region "$BACKUP_REGION"
aws cloudtrail get-trail-status --name "$AUDIT_TRAIL" --region "$PRIMARY_REGION"
aws cloudtrail get-event-selectors --trail-name "$AUDIT_TRAIL" --region "$PRIMARY_REGION"
```

تراجع أذونات KMS والنسخ وIAM الفعلية أيضًا، ونجاح وظائف النسخ ووقت أحدث نقطة قابلة للاستعادة وحالة تكرار الكائنات والاحتفاظ والحذف المقيد؛ لا تُستنتج من وجود أسماء الخدمات. تُختبر استعادة DB والملفات وإقلاع الحزم في بيئة مؤقتة مستقلة، مع تسلسل أحداث أعمال مرصود، دون تعديل الإنتاج. لا تضمن replication وحدها RPO أقل من خمس دقائق؛ يلزم القياس ورفض الإطلاق إذا لم يتحقق.

المتبقي الخارجي المحدد: حساب/بيئة اختبار وميزانية، ثم تطبيق الضوابط والتحقق من أدلتها. لا يمكن توليد إثبات مزود فعلي من بيانات المختبر أو توقيع تقرير مصطنع. بوابة `recovery:runtime:readiness` تبقى مغلقة إلى ورود الاعتمادات الحقيقية المطلوبة بالعقد.
