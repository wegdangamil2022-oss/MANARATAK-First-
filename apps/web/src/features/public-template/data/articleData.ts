import type { PublicArticle } from '../types';
export type ArticleContentType = PublicArticle['contentType'];

export interface ArticlePreview {
  author?: string;
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  excerptAr: string;
  excerptEn: string;
  contentType: ArticleContentType;
  contentTypeLabelAr: string;
  contentTypeLabelEn: string;
  categoryAr: string;
  categoryEn: string;
  countryAr: string;
  countryEn: string;
  readingTime: string;
  readingTimeEn?: string;
  updatedAt: string;
  updatedAtEn?: string;
  coverImage: string;
  featured: boolean;
}

export interface ArticleSection {
  id: string;
  headingAr: string;
  headingEn: string;
  paragraphsAr: string[];
  paragraphsEn: string[];
  bulletsAr?: string[];
  bulletsEn?: string[];
  calloutAr?: string;
  calloutEn?: string;
}

export interface GoldenArticleRecord extends ArticlePreview {
  authorNameAr: string;
  authorNameEn: string;
  authorRoleAr: string;
  authorRoleEn: string;
  keyTakeawaysAr: string[];
  keyTakeawaysEn: string[];
  sections: ArticleSection[];
}

export const ARTICLE_PREVIEWS: ArticlePreview[] = [
  {
    id: 'art_cultural_exchange',
    slug: 'yemen-cultural-exchange-scholarships-guide',
    titleAr: 'الدليل الشامل لمنح التبادل الثقافي اليمني واختبار المفاضلة 2026/2027',
    titleEn: 'Comprehensive Guide to Yemen Cultural Exchange Scholarships & Selection Exam 2026/2027',
    excerptAr:
      'المرجع الرسمي المتكامل لمنح التبادل الثقافي اليمني: شروط الأهلية، الفرق بين التبادل والمنح المستقلة، حاسبة المفاضلة، المقررات الدراسية، ملاحق الدول (المجر، الصين، السعودية، مصر، الجزائر، كوبا، باكستان)، وتوزيع مقاعد الـ 22 محافظة.',
    excerptEn:
      'Complete official reference for Yemen Cultural Exchange Scholarships: eligibility, selection exam calculator, syllabus, country appendices (Hungary, China, PMU, Egypt, Algeria, Cuba, Pakistan), and 22 governorates seat quotas.',
    contentType: 'STUDY_GUIDE',
    contentTypeLabelAr: 'دليل رسمي شامل',
    contentTypeLabelEn: 'Official Master Guide',
    categoryAr: 'منح التبادل الثقافي',
    categoryEn: 'Cultural Exchange',
    countryAr: 'اليمن والدول الشريكة',
    countryEn: 'Yemen & Partner Countries',
    readingTime: '25 دقيقة',
    readingTimeEn: '25 min read',
    updatedAt: 'يوليو 2026',
    updatedAtEn: 'July 2026',
    coverImage:
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
    featured: true,
  },
  {
    id: 'art_1',
    slug: 'how-to-apply-turkiye-burslari',
    titleAr: 'الدليل الكامل للتقديم على المنحة التركية خطوة بخطوة',
    titleEn: 'Step-by-Step Guide to Applying for Türkiye Bursları',
    excerptAr: 'تعرف على الوثائق المطلوبة، معايير التقييم الأكاديمي، وكيفية كتابة خطاب النوايا واجتياز المقابلة الشخصية بنجاح.',
    excerptEn: 'Learn about required documents, academic evaluation criteria, and how to write a strong letter of intent.',
    contentType: 'STUDY_GUIDE',
    contentTypeLabelAr: 'دليل منح',
    contentTypeLabelEn: 'Scholarship Guide',
    categoryAr: 'أدلة المنح',
    categoryEn: 'Scholarship Guides',
    countryAr: 'تركيا',
    countryEn: 'Turkey',
    readingTime: '8 دقائق',
    readingTimeEn: '8 min read',
    updatedAt: 'مارس 2026',
    updatedAtEn: 'March 2026',
    coverImage: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80',
    featured: true,
  },
  {
    id: 'art_2',
    slug: 'study-medicine-in-germany',
    titleAr: 'دراسة الطب البشري في ألمانيا: السنة التحضيرية والقبول الجامعي',
    titleEn: 'Studying Human Medicine in Germany: Studienkolleg and Admission',
    excerptAr: 'خارطة طريق شاملة لدراسة الطب في الجامعات الألمانية الحكومية مجاناً، بداية من مستوى اللغة المطلوب وحتى اجتياز امتحان FSP.',
    excerptEn: 'A comprehensive roadmap for studying medicine at German public universities tuition-free.',
    contentType: 'STUDY_GUIDE',
    contentTypeLabelAr: 'دليل دراسي',
    contentTypeLabelEn: 'Study Guide',
    categoryAr: 'الدراسة في الخارج',
    categoryEn: 'Study Abroad',
    countryAr: 'ألمانيا',
    countryEn: 'Germany',
    readingTime: '10 دقائق',
    readingTimeEn: '10 min read',
    updatedAt: 'فبراير 2026',
    updatedAtEn: 'February 2026',
    coverImage: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80',
    featured: true,
  },
  {
    id: 'art_3',
    slug: 'malaysia-student-visa-process',
    titleAr: 'إجراءات الفيزا الدراسية في ماليزيا (EMGS) وتكاليف المعيشة',
    titleEn: 'Malaysia Student Visa Process (EMGS) and Cost of Living',
    excerptAr: 'كل ما تحتاج معرفته حول التقديم عبر بوابة EMGS، الفحص الطبي، وتقدير الميزانية الشهرية للسكن والمعيشة في كوالالمبور.',
    excerptEn: 'Everything you need to know about EMGS visa processing, medical checks, and monthly living budgets in Kuala Lumpur.',
    contentType: 'STUDY_GUIDE',
    contentTypeLabelAr: 'دليل تأشيرات',
    contentTypeLabelEn: 'Visa Guide',
    categoryAr: 'التأشيرات والمعيشة',
    categoryEn: 'Visas & Living',
    countryAr: 'ماليزيا',
    countryEn: 'Malaysia',
    readingTime: '6 دقائق',
    readingTimeEn: '6 min read',
    updatedAt: 'يناير 2026',
    updatedAtEn: 'January 2026',
    coverImage: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1200&q=80',
    featured: true,
  },
];

const GOLDEN_ARTICLE_DESIGNS: GoldenArticleRecord[] = [
  {
    ...ARTICLE_PREVIEWS[0],
    authorNameAr: 'وحدة الإرشاد الأكاديمي والبعثات — منارتك',
    authorNameEn: 'Manaratk Academic & Scholarships Unit',
    authorRoleAr: 'الدليل المرجعي الرسمي المعتمد لمنح التبادل الثقافي',
    authorRoleEn: 'Official Reference Guide for Cultural Exchange Scholarships',
    keyTakeawaysAr: [
      'التفريق الدقيق بين مقاعد التبادل الثقافي الحكومية ومسارات المنح الخارجية أو الجامعية المستقلة.',
      'آلية احتساب النتيجة الموزونة (30% للثانوية العامة + 70% لاختبار المفاضلة) واستثناء دورة 2026/2027.',
      'المقررات والوحدات الداخلة والمحذوفة في مواد الرياضيات والكيمياء واللغة الإنجليزية.',
      'ملاحق تفصيلية شاملة لمنح المجر، الصين (Type A واختبار CSCA)، جامعة الأمير محمد بن فهد، مصر، الجزائر، كوبا، وباكستان.',
      'توزيع المقاعد التفصيلي لجميع المحافظات اليمنية (22 محافظة) وفئة الخارج وفق قاعدة التوازن 50/50.',
    ],
    keyTakeawaysEn: [
      'Clear distinction between official Cultural Exchange seats and independent external scholarships.',
      'Weighted selection formula (30% High School + 70% Selection Exam) and the 2026/2027 cycle rules.',
      'Complete syllabus and excluded lessons for Mathematics, Chemistry, and English.',
      'Comprehensive country appendices for Hungary, China (Type A & CSCA), PMU, Egypt, Algeria, Cuba, and Pakistan.',
      'Audited seat distribution across all 22 Yemeni governorates plus Abroad category.',
    ],
    sections: [],
  },
  {
    ...ARTICLE_PREVIEWS[1],
    authorNameAr: 'فريق المستشارين الأكاديميين',
    authorNameEn: 'Academic Advisory Team',
    authorRoleAr: 'وحدة المنح الدولية - منارتك',
    authorRoleEn: 'International Scholarships Unit',
    keyTakeawaysAr: [
      'التقديم على المنحة التركية مجاني بالكامل ويتم حصرياً عبر البوابة الرسمية.',
      'المعدل التراكمي المطلوب لا يقل عن 70% للبكالوريوس، و75% للماجستير والدكتوراه، و90% للتخصصات الطبية.',
      'خطاب النوايا والأنشطة التطوعية يمثلان جزءاً محورياً من التقييم إلى جانب التفوق الأكاديمي.',
    ],
    keyTakeawaysEn: [
      'Applying for Türkiye Bursları is completely free through the official portal.',
      'Minimum GPA requirements: 70% for Bachelor, 75% for Postgraduate, and 90% for Medical fields.',
      'The Letter of Intent and extracurricular activities play a decisive role in evaluation.',
    ],
    sections: [
      {
        id: 'sec_overview',
        headingAr: 'نظرة عامة على المنحة التركية ومزاياها',
        headingEn: 'Overview of Türkiye Bursları and Its Benefits',
        paragraphsAr: [
          'تُعد المنحة التركية (Türkiye Bursları) واحدة من أبرز البرامج الحكومية الممولة بالكامل على مستوى العالم، حيث تستقطب آلاف الطلاب الدوليين سنوياً للدراسة في أعرق الجامعات التركية.',
          'تغطي المنحة الرسوم الدراسية كاملة، السكن الجامعي، التأمين الصحي، سنة تحضيرية لدراسة اللغة التركية، بالإضافة إلى راتب شهري وتذاكر الطيران ذهاباً وإياباً.',
        ],
        paragraphsEn: [
          'Türkiye Bursları is one of the world’s leading government-funded scholarship programs, welcoming thousands of international students every year.',
          'It covers full tuition fees, university accommodation, health insurance, a one-year Turkish language preparatory course, monthly stipend, and round-trip flights.',
        ],
        bulletsAr: [
          'إعفاء كامل من الرسوم الدراسية في الجامعات الحكومية.',
          'سكن طلابي مجاني شامل وجبات الطعام.',
          'تذاكر سفر دولية عند بداية الدراسة وبعد التخرج.',
        ],
        bulletsEn: [
          'Full tuition fee waiver at public universities.',
          'Free student dormitory accommodation with meals.',
          'International flight tickets upon arrival and graduation.',
        ],
      },
      {
        id: 'sec_documents',
        headingAr: 'الوثائق الأساسية المطلوبة للتقديم',
        headingEn: 'Essential Documents Required for Application',
        paragraphsAr: [
          'يتطلب نظام التقديم الإلكتروني رفع نسخ واضحة وملونة من الوثائق الرسمية قبل إغلاق باب التسجيل في شهر فبراير من كل عام.',
        ],
        paragraphsEn: [
          'The online application system requires clear, scanned copies of official documents before the February deadline.',
        ],
        bulletsAr: [
          'جواز سفر ساري المفعول أو بطاقة الهوية الوطنية.',
          'شهادة التخرج وكشف الدرجات الرسمي لجميع السنوات.',
          'رسالتا توصية أكاديمية من أساتذة سابقين.',
          'شهادات اللغة الدولية (إن وجدت) وشهادات الأنشطة التطوعية.',
        ],
        bulletsEn: [
          'Valid passport or national ID card.',
          'Graduation certificate and official academic transcripts.',
          'Two academic recommendation letters.',
          'Language proficiency and extracurricular certificates.',
        ],
        calloutAr: 'نصيحة مهمة: ابدأ بتجهيز مسودة خطاب النوايا مبكراً وركز على ربط تخصصك الأكاديمي بأهدافك المستقبلية.',
        calloutEn: 'Pro Tip: Draft your Letter of Intent early and clearly connect your chosen major to your career goals.',
      },
    ],
  },
  {
    ...ARTICLE_PREVIEWS[2],
    authorNameAr: 'د. سامي المنصور',
    authorNameEn: 'Dr. Sami Al-Mansour',
    authorRoleAr: 'مستشار القبول الجامعي في أوروبا',
    authorRoleEn: 'European University Admissions Advisor',
    keyTakeawaysAr: [
      'الدراسة في الجامعات الألمانية الحكومية شبه مجانية، وتقتصر على رسوم إدارية فصلية بسيطة.',
      'يحتاج خريجو الثانوية من خارج الاتحاد الأوروبي غالباً إلى اجتياز السنة التحضيرية (M-Kurs) للتخصصات الطبية.',
      'إتقان اللغة الألمانية حتى مستوى C1 شرط أساسي لدخول كليات الطب البشري.',
    ],
    keyTakeawaysEn: [
      'Public universities in Germany charge no tuition fees, only a nominal semester contribution.',
      'Non-EU high school graduates typically complete the medical foundation year (Studienkolleg M-Kurs).',
      'German proficiency at C1 level is mandatory for medical school admission.',
    ],
    sections: [
      {
        id: 'sec_pathway',
        headingAr: 'مسار القبول في كليات الطب الألمانية',
        headingEn: 'Admission Pathway to German Medical Schools',
        paragraphsAr: [
          'تتميز كليات الطب في ألمانيا مثل جامعة هايدلبرغ وجامعة ميونخ التقنية بمستوى سريري وبحثي عالمي، وتخضع مقاعد الطب لنظام مفاضلة دقيق يعتمد على المعدل التراكمي ونتائج السنة التحضيرية.',
        ],
        paragraphsEn: [
          'German medical faculties such as Heidelberg and TUM offer world-class clinical training, with competitive admission based on GPA and Studienkolleg scores.',
        ],
        calloutAr: 'احرص على التقديم على قبول مشروط (Conditional Admission) فور وصولك لمستوى B1 في اللغة الألمانية.',
        calloutEn: 'Apply for conditional admission as soon as you achieve B1 German proficiency.',
      },
    ],
  },
  {
    ...ARTICLE_PREVIEWS[3],
    authorNameAr: 'أ. لينا عبد الرحمن',
    authorNameEn: 'Ms. Lina Abdulrahman',
    authorRoleAr: 'مسؤولة شؤون الطلاب الدوليين - آسيا',
    authorRoleEn: 'International Student Affairs - Asia',
    keyTakeawaysAr: [
      'بوابة EMGS هي الجهة الحكومية الوحيدة المعتمدة لإصدار خطاب الموافقة على التأشيرة (VAL).',
      'تستغرق إجراءات إصدار الفيزا عادة ما بين 4 إلى 6 أسابيع من تاريخ اكتمال المستندات.',
      'تُعد ماليزيا من أفضل الوجهات الاقتصادية للطلاب بمتوسط تكلفة معيشة يتراوح بين 350 و500 دولار شهرياً.',
    ],
    keyTakeawaysEn: [
      'EMGS is the official portal responsible for issuing the Visa Approval Letter (VAL).',
      'Visa processing typically takes 4 to 6 weeks once documents are submitted.',
      'Malaysia offers affordable student living ranging between $350 and $500 per month.',
    ],
    sections: [
      {
        id: 'sec_emgs',
        headingAr: 'خطوات استخراج خطاب الموافقة على التأشيرة (VAL)',
        headingEn: 'Steps to Obtain the Visa Approval Letter (VAL)',
        paragraphsAr: [
          'بعد الحصول على خطاب القبول الجامعي (Offer Letter)، يقوم الطالب أو المكتب المعتمد برفع المستندات وسداد رسوم التأشيرة والتأمين الصحي عبر منصة EMGS ومتابعة نسبة إنجاز الطلب.',
        ],
        paragraphsEn: [
          'After receiving the university Offer Letter, documents and visa fees are submitted via EMGS to track application progress.',
        ],
      },
    ],
  },
];

export const GOLDEN_ARTICLES: Array<Omit<PublicArticle, 'sections'> & Omit<GoldenArticleRecord, 'sections'> & { sections: Array<PublicArticle['sections'][number] & ArticleSection> }> = GOLDEN_ARTICLE_DESIGNS.map(record => ({
  ...record, author: record.authorNameAr,
  sections: record.sections.map(section => ({ ...section, title: section.headingAr, paragraphs: section.paragraphsAr, bullets: section.bulletsAr })),
}));
