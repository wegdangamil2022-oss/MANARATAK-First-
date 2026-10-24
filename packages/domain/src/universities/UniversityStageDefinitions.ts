/** Source columns, not a second university model. Immutable evidence is never an editor value. */
export interface UniversityStageField {
  source: string;
  ar: string;
  canonical?: string;
  type?: 'number' | 'boolean' | 'lines';
}
export interface UniversityStageCard {
  id: string;
  stage: number;
  ar: string;
  en: string;
  fields: UniversityStageField[];
}
const fields = (rows: string): UniversityStageField[] =>
  rows
    .trim()
    .split('\n')
    .map((line) => {
      const [source, ar, canonical, type] = line.trim().split('|');
      return {
        source,
        ar,
        ...(canonical ? { canonical } : {}),
        ...(type ? { type: type as UniversityStageField['type'] } : {}),
      };
    });
const card = (
  stage: number,
  id: string,
  ar: string,
  en: string,
  rows: string,
): UniversityStageCard => ({ stage, id, ar, en, fields: fields(rows) });
export const UNIVERSITY_STAGE_CARDS: UniversityStageCard[] = [
  card(
    1,
    'basic-identity',
    'هوية الجامعة',
    'University identity',
    `
Reference ID|معرّف الجامعة في المصدر
National Code|الرمز الوطني|nationalCode
Official English Name|الاسم الإنجليزي الرسمي|displayName
Local Name|الاسم المحلي|officialLocalName`,
  ),
  card(
    1,
    'basic-location',
    'الموقع الأولي',
    'Initial location',
    `
Country|الدولة في المصدر
ISO3|رمز الدولة في المصدر
City|المدينة في المصدر
City Source ID|مرجع المدينة في ملف المصدر
City Region Code|رمز إقليم المدينة في المصدر
Geography Status|حالة الجغرافيا في المصدر
Geography Review Reason|سبب مراجعة الجغرافيا في المصدر`,
  ),
  card(
    1,
    'basic-institution',
    'نوع المؤسسة وحالة المصدر',
    'Institution and source status',
    `
Institution Type|نوع المؤسسة|institutionType
Ownership|الملكية|institutionalOwnership
Status|حالة المصدر`,
  ),
  card(
    1,
    'basic-links',
    'الموقع والمصدر الأول',
    'Initial website and source',
    `
Official Website|الموقع الرسمي|officialWebsite
Official Source|المصدر الأول`,
  ),
  card(
    2,
    'enrichment-match',
    'المطابقة مع المرحلة الأولى',
    'Stage one comparison',
    `
University Reference ID|معرّف الجامعة في المصدر
Original Imported Name|الاسم المستورد الأصلي
Country|الدولة الأصلية
Country ISO3|رمز الدولة الأصلي
City|المدينة الأصلية
Original Institution Type|نوع المؤسسة الأصلي
Original Ownership|الملكية الأصلية
Original Website URL|الموقع الأصلي
Original Source URL|المصدر الأصلي`,
  ),
  card(
    2,
    'enrichment-identity',
    'الهوية الرسمية المحققة',
    'Verified official identity',
    `
Official English Name|الاسم الإنجليزي الرسمي|displayName
Official Local Name|الاسم المحلي الرسمي|officialLocalName
Official Abbreviation|الاختصار الرسمي|officialAbbreviation
Verified Institution Type|نوع المؤسسة المحقق|institutionType
Verified Ownership|الملكية المحققة|institutionalOwnership
Founded Year|سنة التأسيس|foundedYear|number
Short Description|نبذة الجامعة|description|lines`,
  ),
  card(
    2,
    'enrichment-contact',
    'الموقع والتواصل',
    'Location and contact',
    `
Continent|القارة في المصدر
State / Region|الإقليم في المصدر
Verified City|المدينة المحققة في المصدر
Main Campus Address|عنوان الحرم الرئيسي|mainCampusAddress
Map URL|رابط الخريطة|mapUrl
Official Phone|الهاتف الرسمي|contactPhone
Main Official Social Media URL|التواصل الاجتماعي الرسمي|officialSocialMediaUrl`,
  ),
  card(
    2,
    'enrichment-links',
    'الروابط والسجلات الرسمية',
    'Official links and registries',
    `
Official Website URL|الموقع الرسمي|officialWebsite
Official Website Status|حالة الموقع الموثقة|officialWebsiteStatus
Official Website Source|دليل الموقع|officialWebsiteSource
Official Application Portal URL|بوابة التقديم الرسمية|internationalAdmissions.applicationPortalUrl
Government Registry URL|رابط السجل الحكومي|governmentRegistryUrl
Government Authority Name|الجهة الحكومية|governmentAuthorityName
University System URL|رابط النظام الجامعي|universitySystemUrl
Central Admissions Portal URL|بوابة القبول المركزية|centralAdmissionsPortalUrl
Trusted International Directory URL|الدليل الدولي الموثوق|trustedInternationalDirectoryUrl
External Institution ID|المعرّف المؤسسي الخارجي|externalInstitutionId`,
  ),
  card(
    2,
    'enrichment-evidence',
    'التوثيق وجودة البيانات',
    'Provenance and data quality',
    `
Primary Source Type|نوع المصدر الأساسي
Primary Source URL|رابط المصدر الأساسي
Import Continent File|ملف القارة
Import Batch|دفعة الاستيراد
Import Date|تاريخ الاستيراد
Last Verified Date|تاريخ آخر تحقق
Phase 1 Completion Status|حالة اكتمال الإثراء في المصدر
Review Status|حالة المراجعة المصدرية
Duplicate Check Status|فحص التكرار
Data Confidence|الثقة المصدرية
Review Notes|ملاحظات المراجعة المصدرية`,
  ),
  card(
    3,
    'academic-structure',
    'الدرجات والكليات والتخصصات',
    'Degrees, faculties and majors',
    `
University Reference ID|معرّف الجامعة في المصدر
Available Degrees|الدرجات المتاحة
Faculties|الكليات في المصدر
Key Majors|التخصصات المذكورة — لا تثبت برنامجًا
Official Program Catalog URL|دليل البرامج الرسمي|officialProgramCatalogUrl`,
  ),
  card(
    3,
    'academic-language',
    'لغات وأساليب الدراسة',
    'Study languages and modes',
    `
Languages of Instruction|لغات التدريس|languagesOfInstruction|lines
Study Modes|أساليب الدراسة في المصدر`,
  ),
  card(
    3,
    'academic-admissions',
    'القبول الدولي وبواباته',
    'International admissions',
    `
Accepts International Students?|تقبل الطلاب الدوليين|internationalAdmissions.acceptsInternationalStudents|boolean
Undergraduate Admission URL|قبول البكالوريوس|internationalAdmissions.undergradAdmissionUrl
Graduate Admission URL|قبول الدراسات العليا|internationalAdmissions.postgradAdmissionUrl
International Student Admission URL|قبول الطلاب الدوليين|internationalAdmissions.internationalStudentsUrl
Official Application Portal URL|بوابة التقديم الرسمية|internationalAdmissions.applicationPortalUrl`,
  ),
  card(
    3,
    'academic-tests',
    'متطلبات اللغة والاختبارات',
    'Language and test requirements',
    `
Are There Language Requirements?|وجود متطلبات لغة|hasLanguageRequirements|boolean
Required Languages|اللغات المطلوبة|requiredLanguages|lines
Accepted Language Tests|الاختبارات في المصدر — بحاجة ربط
Official Language Requirements URL|المصدر الرسمي لمتطلبات اللغة|officialLanguageRequirementsUrl`,
  ),
  card(
    3,
    'academic-scholarships',
    'المنح المذكورة بالمصدر',
    'Scholarships mentioned in source',
    `
Are Scholarships Available for International Students?|توفر منح دولية في المصدر|hasInternationalScholarships|boolean
Key International Scholarships|المنح وروابطها في المصدر — بحاجة ربط`,
  ),
  card(
    4,
    'fees-general',
    'الرسوم العامة حسب الدرجة',
    'Tuition by degree',
    `
University Reference ID|معرّف الجامعة في المصدر
Annual Tuition Fee|الرسوم السنوية في المصدر
Graduate Tuition Fee|رسوم الدراسات العليا في المصدر
Currency|عملة الرسوم في المصدر
Official Tuition Fee URL|المصدر الرسمي للرسوم`,
  ),
  card(
    4,
    'fees-special',
    'الرسوم الخاصة والتفصيلية',
    'Specialized tuition',
    `
Undergraduate Medicine Fee, if applicable|رسوم الطب في المصدر
Engineering Undergraduate Fees by Faculty|رسوم الهندسة حسب الكلية في المصدر`,
  ),
  card(
    4,
    'accommodation',
    'السكن الجامعي وتكاليفه',
    'University accommodation',
    `
Is University Accommodation Available?|توفر السكن في المصدر
Are International Students Eligible for Accommodation?|أهلية الطلاب الدوليين للسكن في المصدر
Typical Accommodation Cost|تكلفة السكن في المصدر
Accommodation Cost Currency|عملة السكن في المصدر`,
  ),
  card(
    4,
    'living',
    'المعيشة الشهرية والتغيرات',
    'Living costs',
    `
Average Monthly Living Cost|متوسط المعيشة في المصدر
Living Cost Currency|عملة المعيشة في المصدر
Cost Variation Note|تفاوت التكاليف في المصدر`,
  ),
  card(
    4,
    'documents',
    'الوثائق والمتطلبات',
    'Documents and requirements',
    `
General Required Documents|الوثائق العامة|generalRequiredDocuments|lines
Additional Graduate Requirements|متطلبات الدراسات العليا|additionalGraduateRequirements|lines
Official Required Documents URL|المصدر الرسمي للوثائق|officialRequiredDocumentsUrl`,
  ),
];
export const UNIVERSITY_STAGE_NAMES = [
  ['البيانات الأساسية', 'Basic identity'],
  ['إثراء الجامعة', 'University enrichment'],
  ['البرامج والقبول', 'Programs and admissions'],
  ['الرسوم والسكن', 'Fees and living'],
  ['التصنيفات', 'World rankings'],
] as const;
export interface UniversityStageEvidence {
  stage: number;
  sourceState: 'AVAILABLE' | 'NOT_SUPPLIED' | 'UNAVAILABLE';
  importState: 'IMPORTED' | 'UNKNOWN';
  continent: string | null;
  fields: Record<string, unknown>;
  sourceFile?: string;
  sourceHash?: string;
  sourceRow?: number;
  importedAt?: string;
  sourceRecordId?: string;
  issues: string[];
}
export interface UniversityStageEvidenceReader {
  read(
    publicId: string,
    sources: unknown[],
    geography?: { region?: string | null; subregion?: string | null },
  ): Promise<UniversityStageEvidence[]>;
}
