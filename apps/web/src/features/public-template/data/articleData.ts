import { PublicArticle } from '../types';

export interface ArticlePreviewRecord {
  id: string;
  titleAr: string;
  titleEn: string;
  contentType: PublicArticle['contentType'];
  contentTypeLabelAr: string;
  categoryAr: string;
  author: string;
  updatedAt: string;
  excerptAr?: string;
  linkedEntities?: PublicArticle['linkedEntities'];
}

export const ARTICLE_PREVIEWS: ArticlePreviewRecord[] = [
  {
    id: 'art_101',
    titleAr: 'الدليل الشامل للتقديم على المنح الدراسية التركية المباشرة YTB 2026',
    titleEn: 'Comprehensive Guide to YTB Turkish Scholarships 2026',
    contentType: 'STUDY_GUIDE',
    contentTypeLabelAr: 'دليل دراسي',
    categoryAr: 'منح وقبولات',
    author: 'فريق التحرير الأكاديمي',
    updatedAt: '28 يوليو 2026',
    excerptAr: 'دليل تفصيلي يتناول شروط التقديم على المنحة التركية، آلية رفع المستندات، والاستعداد للمقابلات.',
    linkedEntities: [
      { type: 'SCHOLARSHIP', id: 'turkiye-burslari', name: 'منحة الحكومة التركية', nameEn: 'Türkiye Scholarships' },
      { type: 'COUNTRY', id: 'turkey', name: 'تركيا', nameEn: 'Turkey' },
    ],
  },
  {
    id: 'art_102',
    titleAr: 'كيفية كتابة خطاب الدافع المتميز (Motivation Letter) للجامعات الألمانية',
    titleEn: 'How to Write a Winning Motivation Letter for German Universities',
    contentType: 'ARTICLE',
    contentTypeLabelAr: 'مقال تحريري',
    categoryAr: 'نصائح القبول',
    author: 'مستشار التحرير',
    updatedAt: '27 يوليو 2026',
  },
  {
    id: 'art_103',
    titleAr: 'قائمة التحقق الميدانية قبل السفر والدراسة في المملكة المتحدة',
    titleEn: 'Pre-departure Checklist for International Students in the UK',
    contentType: 'CHECKLIST',
    contentTypeLabelAr: 'قائمة تحقق',
    categoryAr: 'الحياة الطلابية',
    author: 'محرر الشؤون الطلابية',
    updatedAt: '26 يوليو 2026',
  },
  {
    id: 'art_104',
    titleAr: 'تحديثات معايير الكفاءة اللغوية المطلوبة باختبار IELTS لعام 2026',
    titleEn: '2026 Updated Language Proficiency IELTS Requirements',
    contentType: 'NEWS',
    contentTypeLabelAr: 'دليل محدث',
    categoryAr: 'اختبارات دولية',
    author: 'قسم الأخبار الأكاديمية',
    updatedAt: '25 يوليو 2026',
    excerptAr: 'دليل سريع لفهم درجات IELTS ونسخه وصلاحية النتيجة وما الذي يجب التحقق منه قبل استخدام الاختبار للجامعة أو المنحة.',
    linkedEntities: [
      { type: 'EXAM', id: 'ielts', name: 'اختبار IELTS', nameEn: 'IELTS' },
      { type: 'UNIVERSITY', id: 'oxford', name: 'جامعة أكسفورد', nameEn: 'University of Oxford' },
      { type: 'SCHOLARSHIP', id: 'csc-china', name: 'منحة الحكومة الصينية (CSC)', nameEn: 'Chinese Government Scholarship' },
      { type: 'COUNTRY', id: 'china', name: 'الصين', nameEn: 'China' },
    ],
  },
  {
    id: 'art_105',
    titleAr: 'مقارنة شاملة بين تخصص الذكاء الاصطناعي وهندسة البرمجيات',
    titleEn: 'Comprehensive Comparison: AI vs Software Engineering',
    contentType: 'ARTICLE',
    contentTypeLabelAr: 'مقال تحريري',
    categoryAr: 'توجيه أكاديمي',
    author: 'فريق التوجيه المهني',
    updatedAt: '24 يوليو 2026',
  },
];

export const GOLDEN_ARTICLES: PublicArticle[] = [
  {
    id: 'art_104',
    slug: 'ielts-language-requirements-2026',
    titleAr: 'تحديثات معايير الكفاءة اللغوية المطلوبة باختبار IELTS لعام 2026',
    titleEn: '2026 Updated Language Proficiency IELTS Requirements',
    contentType: 'NEWS',
    contentTypeLabelAr: 'دليل محدث',
    categoryAr: 'اختبارات دولية',
    author: 'قسم الأخبار الأكاديمية',
    reviewer: 'فريق منارتك للتحقق الأكاديمي',
    updatedAt: '25 يوليو 2026',
    readingTime: '6 دقائق',
    excerptAr:
      'دليل عملي لفهم درجات IELTS ونسخه وصلاحية النتيجة، مع توضيح ما يجب التحقق منه قبل الاعتماد عليه في الجامعة أو المنحة.',
    tags: ['IELTS', 'القبول الجامعي', 'المنح الدراسية', 'اللغة الإنجليزية'],
    sections: [
      {
        title: 'ما الذي يقيسه IELTS؟',
        paragraphs: [
          'يقيس IELTS أربع مهارات رئيسية: الاستماع والقراءة والكتابة والمحادثة. يحصل الطالب على درجة مستقلة لكل مهارة ودرجة كلية Overall Band Score.',
        ],
        bullets: ['Listening', 'Reading', 'Writing', 'Speaking'],
      },
      {
        title: 'الدرجة والصلاحية',
        paragraphs: [
          'نطاق الدرجات من 0 إلى 9 مع أنصاف الدرجات. لا توجد درجة نجاح عالمية؛ الجامعة أو المنحة أو الجهة المستقبلة هي التي تحدد الدرجة المطلوبة والحد الأدنى لكل مهارة.',
        ],
        bullets: [
          'الدرجة الكلية: 0–9 Bands.',
          'قد تشترط الجهة درجة كلية وحدًا أدنى في كل مهارة.',
          'يوصى عادة باستخدام النتيجة خلال سنتين من تاريخ الاختبار.',
        ],
      },
      {
        title: 'اختر النسخة الصحيحة قبل الحجز',
        bullets: [
          'IELTS Academic هو المسار المعتاد للقبول الجامعي والتسجيل المهني عند اشتراط IELTS.',
          'General Training يرتبط أكثر بالهجرة والعمل وبعض أغراض التدريب.',
          'IELTS for UKVI مطلوب في مسارات بريطانية محددة عندما يكون SELT شرطًا رسميًا.',
          'IELTS Online Academic لا يُفترض قبوله لدى كل جامعة؛ يجب التحقق من الجهة قبل الحجز.',
        ],
      },
      {
        title: 'عند التقديم للجامعة أو المنحة',
        paragraphs: [
          'لا تعتمد على عبارة «IELTS مقبول» وحدها. تحقق من البرنامج نفسه، الدرجة المطلوبة، الحد الأدنى للمهارات، النسخة المقبولة، وطريقة تقديم الاختبار.',
        ],
        bullets: [
          'متطلبات الجامعة تختلف حسب البرنامج والمرحلة الدراسية.',
          'المنحة قد تضيف شرطًا لغويًا مستقلًا عن شرط الجامعة.',
          'في البرامج غير الإنجليزية قد يكون اختبار لغة آخر هو المتطلب الأساسي.',
        ],
      },
      {
        title: 'النتائج والإعادة',
        bullets: [
          'نتائج IELTS on Computer تظهر عادة خلال 1–5 أيام وفق بيانات المشروع المرجعية.',
          'IELTS Online Academic تظهر نتائجه عادة خلال 6–8 أيام.',
          'One Skill Retake قد يتيح إعادة مهارة واحدة عند توفر الخدمة وقبول الجهة المستقبلة.',
        ],
      },
      {
        title: 'الخلاصة',
        paragraphs: [
          'تعامل مع IELTS كمتطلب مرتبط بجهة وبرنامج محددين، وليس كشرط ثابت موحد. ابدأ من صفحة الجامعة أو المنحة، ثم افتح متطلب الاختبار، وبعدها اختر النسخة والدرجة وطريقة التقديم المناسبة.',
        ],
      },
    ],
    linkedEntities: [
      { type: 'EXAM', id: 'ielts', name: 'اختبار IELTS', nameEn: 'IELTS', meta: 'صفحة الاختبار الكاملة في منارتك' },
      { type: 'UNIVERSITY', id: 'oxford', name: 'جامعة أكسفورد', nameEn: 'University of Oxford', meta: 'مثال على جامعة لها متطلبات لغة حسب البرنامج' },
      { type: 'SCHOLARSHIP', id: 'csc-china', name: 'منحة الحكومة الصينية (CSC)', nameEn: 'Chinese Government Scholarship', meta: 'مثال على منحة قد يرتبط فيها إثبات اللغة بلغة البرنامج' },
      { type: 'COUNTRY', id: 'china', name: 'الصين', nameEn: 'China', meta: 'برامج إنجليزية وصينية ومتطلبات تختلف حسب الجامعة' },
    ],
    officialLinks: [
      { label: 'IELTS — الموقع الرسمي', url: 'https://ielts.org/', note: 'المصدر الرسمي للاختبار والنسخ والسياسات' },
      { label: 'البحث عن اختبار وحجزه', url: 'https://ielts.org/take-a-test', note: 'المراكز والمواعيد وطرق التقديم' },
    ],
  },
];

