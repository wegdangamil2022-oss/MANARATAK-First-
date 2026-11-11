/** Presentation only. Option values and canonical identities must remain unchanged. */
const labels:Record<string,string>={
  ALL:'الكل',ACTIVE:'نشط',INACTIVE:'غير نشط',DISABLED:'معطل',ENABLED:'مفعّل',NOT_CONFIGURED:'غير مهيأ',
  DRAFT:'مسودة',IMPORTED:'مستورد',PENDING:'قيد الانتظار',READY_TO_REVIEW:'جاهز للمراجعة',READY_TO_PUBLISH:'جاهز للنشر',
  PUBLISHED:'منشور',ARCHIVED:'مؤرشف',REJECTED:'مرفوض',APPROVED:'معتمد',VERIFIED:'متحقق منه',FAILED:'فشل',
  NEEDS_REVIEW:'يحتاج مراجعة',INCOMPLETE:'غير مكتمل',COMPLETE:'مكتمل',DEPRECATED:'متقادم',SUPERSEDED:'مستبدل',MERGED:'مدمج',
  OPEN:'مفتوح',CLOSED:'مغلق',RESOLVED:'محسوم',UNRESOLVED:'غير محسوم',CANCELLED:'ملغى',CANCELED:'ملغى',
  GLOBAL:'عام',DOMAIN:'قسم',IDENTITY:'هوية',TIME:'الوقت',IP:'عنوان الشبكة',COURSE_SCOPE:'نطاق الدورة',
  STRING:'نص',NUMBER:'رقم',BOOLEAN:'قيمة منطقية',JSON:'بيانات منظمة',CSV:'قيم مفصولة بفواصل',NDJSON:'سجلات منظمة متتابعة',
  RTL:'من اليمين إلى اليسار',LTR:'من اليسار إلى اليمين',ENGLISH:'الإنجليزية',ARABIC:'العربية',
  CUSTOM_NATIONAL:'تصنيف محلي',ISCED:'التصنيف الدولي للتعليم',CIP:'تصنيف البرامج التعليمية',
  ACADEMIC_FIELD:'مجال أكاديمي',DISCIPLINE:'تصنيف فرعي',PROGRAM_AREA:'مجال برنامج',
  BACHELOR:'بكالوريوس',MASTER:'ماجستير',DOCTORATE:'دكتوراه',FELLOWSHIP:'زمالة',UNKNOWN:'غير معلوم',
  SCHOLARSHIPS:'المنح الدراسية',UNIVERSITIES:'الجامعات',MAJORS:'التخصصات',INTERNATIONAL_TESTS:'الاختبارات',
  COURSES:'الدورات',CERTIFICATES:'الشهادات',REFERENCE_DATA:'البيانات المرجعية',ACADEMIC_TAXONOMY:'التصنيف الأكاديمي',
  CMS:'إدارة المحتوى',NOTIFICATIONS:'الإشعارات',FINANCE:'المالية',SERVICES:'الخدمات',CAREERS:'الوظائف',
  STUDENTS:'الطلاب',STUDENT_TOOLS:'أدوات الطلاب',STUDENT_SUPPORT:'دعم الطلاب',AI:'الذكاء الاصطناعي',
  IDENTITIES:'الهويات',AUTHORIZATION:'الصلاحيات',ASSETS:'الملفات',IMPORTS:'الاستيراد',AUDIT:'التدقيق',SETTINGS:'الإعدادات',
  INFO:'معلومة',WARNING:'تحذير',ERROR:'خطأ',CRITICAL:'حرج',HIGH:'مرتفع',MEDIUM:'متوسط',LOW:'منخفض',
  SUCCESS:'ناجح',PROCESSING:'قيد المعالجة',QUEUED:'في قائمة الانتظار',COMPLETED:'مكتمل',RUNNING:'قيد التنفيذ',
  MANUAL:'يدوي',AUTOMATIC:'تلقائي',SYSTEM:'النظام',OWNER:'المالك',ADMIN:'مدير',STAFF:'موظف',STUDENT:'طالب',
  PUBLIC:'عام',PRIVATE:'خاص',INTERNAL:'داخلي',EXTERNAL:'خارجي',READ:'قراءة',WRITE:'كتابة',ALLOW:'سماح',DENY:'منع',
  HTTP:'رابط ويب',HTTPS:'رابط آمن',UTC:'التوقيت العالمي',PDF:'مستند محمول',AUTO_NONE:'تلقائي / دون تحديد',
  PREVIEWED:'تمت المعاينة',APPLIED:'مطبق',SPECIALIZATION_CATEGORY:'فئة تخصص',STANDARD_CLASSIFICATION:'تصنيف معياري',STANDARD:'قياسي',
  COUNTRY:'دولة',LANGUAGE:'لغة',TAXONOMY:'تصنيف',DEGREE:'درجة تعليمية',CURRENCY:'عملة',CITY:'مدينة',
  FULL_TIME:'دوام كامل',PART_TIME:'دوام جزئي',VIDEO:'فيديو',AUDIO:'صوت',IMAGE:'صورة',DOCUMENT:'مستند',SUBTITLE:'ترجمة مرئية',OTHER:'أخرى',
  CONFIDENTIAL:'سري',RECEIVED:'مستلم',ACCEPTED:'مقبول',RETRYING:'إعادة المحاولة',BLOCKED:'محظور',REVIEW_REQUIRED:'تتطلب مراجعة',
  TIMED_OUT:'انتهت المهلة',DEAD_LETTER:'متعذر التنفيذ',INITIATED:'بدأت العملية',QUARANTINED:'محجوز للفحص',VALIDATING:'قيد التحقق',
  MALWARE_SCAN_FAILED:'فشل فحص الملفات الضارة',SANITIZING:'قيد التنقية',DELETED:'محذوف',PURGED:'محذوف نهائيًا',RESTRICTED:'مقيد',
  TEMPORARY:'مؤقت',PERMANENT:'دائم',SOFT_DELETED:'محذوف منطقيًا',DISCOVERED:'مكتشف',PENDING_REVIEW:'بانتظار المراجعة',
  SUSPENDED:'موقوف',LOCKED:'مقفل',RATELIMITED:'تجاوز حد الطلبات',SCHOLARSHIP_WEBSITE:'موقع منحة',GOVERNMENT_SCHOLARSHIP_PORTAL:'بوابة منح حكومية',
  FOUNDATION_DONOR_PORTAL:'بوابة مؤسسة مانحة',AGGREGATOR:'مجمّع مصادر',MANUAL_FILE:'ملف يدوي',WEBSITE:'موقع إلكتروني',SITEMAP:'خريطة موقع',
  FEED:'تغذية بيانات',API:'واجهة برمجية',REAL:'حقيقي',TEST:'اختبار',DEMO:'عرض تجريبي',UNCLASSIFIED:'غير مصنف',READY_FOR_REVIEW:'جاهز للمراجعة',PROMOTED:'منقول إلى القسم',DLQ:'قائمة العمليات المتعذرة',
  CONSULTATION:'استشارة',DOCUMENT_PROCESSING:'معالجة مستندات',BOOKING:'حجز',APPLICATION_SUPPORT:'دعم التقديم',MANAGED_SERVICE:'خدمة مُدارة',TENANT:'مؤسسة',
  ASIA:'آسيا',AFRICA:'أفريقيا',EUROPE:'أوروبا',AMERICAS:'الأمريكتان',OCEANIA:'أوقيانوسيا',
  NORTH_AMERICA:'أمريكا الشمالية',SOUTH_AMERICA:'أمريكا الجنوبية',
  STUDENT_PRIVATE:'بيانات الطالب الخاصة',HIGHLY_SENSITIVE:'شديد الحساسية',PROHIBITED:'محظور',
  TEXT_GENERATION:'توليد النصوص',CHAT:'محادثة',STRUCTURED_OUTPUT:'مخرجات منظمة',EMBEDDINGS:'تمثيلات دلالية',RERANKING:'إعادة الترتيب',MODERATION:'مراجعة المحتوى',
  EXTERNAL_LLM:'نموذج لغوي خارجي',OPENAI_COMPATIBLE:'متوافق مع OpenAI',ANTHROPIC:'Anthropic',GOOGLE_GENERATIVE_AI:'ذكاء Google التوليدي',SELF_HOSTED:'استضافة ذاتية',
  TOOL_ASSISTANCE:'مساعدة الأدوات',IMPORT_CLASSIFICATION:'تصنيف الاستيراد',CONTENT_DRAFT:'مسودة محتوى',RECOMMENDATION:'توصيات',TRANSLATION:'ترجمة',SUMMARIZATION:'تلخيص',
  INPUT:'مدخلات',OUTPUT:'مخرجات',BOTH:'كلاهما',REDACT:'حجب البيانات الحساسة',BLOCK:'حظر',REQUIRE_REVIEW:'اشتراط المراجعة',
};
export function adminOptionLabel(value:unknown,ar=true):string{
  if(value&&typeof value==='object'){
    const item=value as Record<string,unknown>,localized=item.localizedNames as Record<string,unknown>|undefined;
    return adminOptionLabel([localized?.[ar?'ar':'en'],ar?item.localizedNameAr:item.localizedNameEn,ar?item.nameAr:item.nameEn,item.displayName,item.canonicalName,item.name,item.id].find(label=>typeof label==='string'&&label.trim()),ar);
  }
  const raw=String(value??'');return ar?(labels[raw.trim().toUpperCase().replace(/[\s/]+/gu,'_')]??raw):raw;
}
