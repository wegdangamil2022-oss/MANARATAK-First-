export const universityStateLabels: Record<string, string> = {
  DRAFT: 'مسودة',
  REVIEW_REQUIRED: 'تحتاج مراجعة',
  ACTIVE: 'نشط',
  INACTIVE: 'غير نشط',
  ARCHIVED: 'مؤرشف',
  NEEDS_REVIEW: 'تحتاج مراجعة',
  APPROVED: 'معتمد',
  REJECTED: 'مرفوض',
  FACULTY: 'كلية',
  SCHOOL: 'مدرسة أكاديمية',
  COLLEGE: 'كلية',
  DEPARTMENT: 'قسم',
  GLOBAL: 'عالمي',
  UNKNOWN: 'غير موثق',
  VERIFIED: 'موثق',
};
export const universityIssueLabels: Record<string, string> = {
  UNIVERSITY_INVALID_PUBLICATION_STATUS: 'يجب أن تكون الجامعة جاهزة للنشر قبل نشرها.',
  UNIVERSITY_INCOMPLETE: 'لم تستوفِ الجامعة اكتمال البيانات وفق عقد المالك.',
  UNIVERSITY_SOURCE_IDENTITY_MISSING: 'معرّف المصدر الدائم للجامعة غير متوفر.',
  UNIVERSITY_CANONICAL_COUNTRY_REFERENCE_MISSING: 'يلزم ربط الجامعة بالدولة المرجعية المعتمدة.',
  UNIVERSITY_CANONICAL_CITY_REFERENCE_MISSING: 'اسم المدينة يحتاج مرجع مدينة معتمدًا قبل النشر.',
  UNIVERSITY_SOURCE_GEOGRAPHY_REVIEW_REQUIRED: 'قرار مراجعة الجغرافيا المصدرية لم يُحسم.',
  UNIVERSITY_PROGRAM_DEGREE_REFERENCE_MISSING: 'أحد البرامج النشطة يحتاج ربط درجة علمية معتمدة.',
  UNIVERSITY_PROGRAM_MAJOR_REFERENCE_MISSING: 'أحد البرامج النشطة يحتاج ربط تخصص معتمد.',
  UNIVERSITY_PROGRAM_MAJOR_REVIEW_REQUIRED: 'ربط التخصص والدرجة في أحد البرامج يحتاج مراجعة.',
  UNIVERSITY_PROGRAM_MAJOR_NOT_PUBLISHED:
    'يجب نشر ملف التخصص الموافق لدرجة البرنامج قبل ظهوره للعامة.',
  UNIVERSITY_NON_ACTIVE_PROGRAMS_EXCLUDED:
    'البرامج غير النشطة تبقى داخلية ولن تظهر في العلاقات العامة.',
  UNIVERSITY_TEST_REFERENCES_NOT_CANONICAL:
    'أسماء الاختبارات المصدرية تحتاج علاقات اختبارات نشطة معتمدة.',
  UNIVERSITY_ADMISSION_TEST_PUBLIC_PROOF_REQUIRED:
    'شرط اختبار نشط يحتاج نسخة منشورة وسلّم درجات موثقًا من مالك الاختبار.',
  UNIVERSITY_LEGACY_ADMISSION_REQUIREMENTS_REVIEW_REQUIRED:
    'شروط القبول القديمة غير المرتبطة ببرنامج تحتاج مراجعة.',
  UNIVERSITY_TEST_REFERENCE_MISSING: 'أحد شروط القبول يحتاج مرجع الاختبار المعتمد.',
  SOURCE_IDENTITY_AMBIGUOUS: 'معرّف الجامعة ظهر في أكثر من ملف؛ يلزم حسم الهوية.',
  SOURCE_IDENTITY_NOT_FOUND_IN_ARTIFACT: 'الملف متوفر للقارة، لكن معرّف هذه الجامعة غير موجود فيه.',
  SOURCE_ARTIFACT_UNAVAILABLE_OR_CHANGED: 'تعذر قراءة النسخة المثبتة من الملف أو تغيّرت بصمتها.',
  KEY_MAJORS_LIMIT_EXCEEDED: 'قائمة التخصصات في المصدر تتجاوز الحد المعتمد وتحتاج مراجعة.',
  INVALID_SCHOLARSHIP_REFERENCE:
    'ذكر المصدر منحة دون اسم ورابط رسمي صالحين؛ لا يُنشأ منها سجل تلقائي.',
  ACCOMMODATION_DETAILS_NOT_APPLICABLE:
    'المصدر ينفي توفر السكن لكنه يتضمن تكلفة أو أهلية للسكن؛ تعارض يحتاج مراجعة.',
};
