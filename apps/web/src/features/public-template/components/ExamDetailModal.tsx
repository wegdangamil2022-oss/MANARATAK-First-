import React, { useState } from 'react';
import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import {
  Clock,
  BarChart3,
  CalendarCheck,
  BookOpen,
  GraduationCap,
  Globe,
  Info,
  ExternalLink,
  Bookmark,
  Check,
  Sparkles,
  CheckCircle2,
  Compass,
  Award,
  Briefcase,
  ShieldAlert,
  FileCheck,
  Building2,
  Languages,
  Layers,
  Table2,
  LayoutGrid,
  HelpCircle,
  Users,
  MapPin,
  Monitor,
  PenTool,
  FileText,
  Laptop,
  Video,
  Search,
  Server,
  Headphones,
  Mic,
  ArrowRight,
  Heart,
  Target,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Exam } from '../types';
import { FavoriteButton } from './FavoriteButton';
import { ExamVectorLogo } from './FeaturedExams';
import { DetailBackButton, DetailSectionHeader, useDetailSearchTarget } from './DetailUi';

interface ExamDetailModalProps {
  exam: Exam;
  onClose: () => void;
  onOpenUniversity?: (id: string) => void;
  onOpenScholarship?: (id: string) => void;
  onOpenCountry?: (id: string) => void;
  onOpenArticle?: (id: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  searchAnchor?: string;
  searchTerm?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  ENGLISH_LANGUAGE: 'اختبارات اللغة الإنجليزية',
  NON_ENGLISH_LANGUAGE: 'اختبارات اللغات الأخرى',
  GENERAL_UNDERGRADUATE_ADMISSION: 'اختبارات قبول البكالوريوس',
  GRADUATE_ADMISSION: 'اختبارات الدراسات العليا',
  NATIONAL_INTERNATIONAL_ADMISSION: 'اختبارات القبول الوطني والدولي',
  SPECIALIZED_ADMISSION: 'اختبارات القبول التخصصي',
  PROFESSIONAL_LICENSING_CERTIFICATION: 'اختبارات الترخيص والشهادات المهنية',
};

const GUIDE_REFERENCE_META = {
  documentTitle: 'اختبار الآيلتس IELTS — الدليل الشامل للطالب',
  officialName: 'International English Language Testing System',
  abbreviation: 'IELTS',
  classification: 'اختبار دولي للكفاءة في اللغة الإنجليزية',
  referenceSource: 'ملف IELTS_2026_Complete_Data_AR.md في مستودع منارتك، إصدار أغسطس 2026.',
  recordedVerificationDate: '2 أغسطس 2026.',
  updateNote:
    'روجعت معلومات مختارة من موقع IELTS الرسمي في 31 أكتوبر 2026؛ أما الرسوم والمواعيد والسياسات المحلية فتظل خاضعة لما يظهر عند الحجز.',
  introParagraph:
    'يقيس اختبار IELTS قدرة المتقدم على فهم اللغة الإنجليزية واستخدامها في الاستماع والقراءة والكتابة والمحادثة. وتستخدمه جامعات وبرامج منح وجهات عمل وهجرة وهيئات مهنية حول العالم. يساعدك هذا الدليل على فهم الاختبار، واختيار النسخة المناسبة، ومعرفة الدرجات المطلوبة، والاستعداد والحجز، والتعامل مع النتائج.',
};

const SECTION1_QUICK_INFO_ROWS = [
  { item: 'نوع الاختبار', details: 'كفاءة دولية في اللغة الإنجليزية', icon: Award },
  { item: 'اللغة', details: 'الإنجليزية', icon: Languages },
  { item: 'المهارات', details: 'الاستماع، القراءة، الكتابة، المحادثة', icon: BookOpen },
  { item: 'المدة', details: 'نحو ساعتين و45 دقيقة للمهارات الأربع، دون إجراءات المركز', icon: Clock },
  { item: 'الدرجات', details: 'من 0 إلى 9، بزيادات نصف درجة', icon: BarChart3 },
  { item: 'النتيجة', details: 'درجة إجمالية + درجة مستقلة لكل مهارة', icon: FileCheck },
  { item: 'الصلاحية', details: 'سنتان موصى بهما عادةً، مع اختلاف قواعد المؤسسات', icon: CalendarCheck },
  { item: 'الانتشار', details: 'آلاف المراكز في دول كثيرة حول العالم', icon: Globe },
];

const IELTS_PARTNERS_LIST = [
  'British Council',
  'IDP IELTS',
  'Cambridge University Press & Assessment',
];

const SUITABILITY_ITEMS = [
  'تتقدم إلى جامعة أوكلية تدرّس بالإنجليزية.',
  'تحتاج إثبات اللغة ضمن منحة دراسية.',
  'تتقدم للهجرة إلى دولة تقبل IELTS.',
  'تحتاج اختبارًا مع مقابلة محادثة مع ممتحن بشري.',
  'تحتاج درجة مستقلة لكل مهارة.',
  'تتقدم إلى هيئة مهنية تقبل IELTS Academic.',
  'تريد إمكانية إعادة مهارة واحدة عبر One Skill Retake، عند توفرها وقبولها.',
  'تريد اختبارًا داخل مركز، أوAcademic Online من المنزل في دولة مدعومة.',
];

const DISTINCTION_ITEMS = [
  'قبول دولي واسع.',
  'مقابلة Speaking مع ممتحن معتمد.',
  'نسخ أكاديمية وعامة وهجرة بريطانية.',
  'نتائج سريعة للاختبار المحوسب.',
  'One Skill Retake في مراكز ودول مدعومة.',
  'تقرير رسمي يمكن التحقق منه إلكترونيًا.',
  'قبول عدة أنماط معيارية للإنجليزية واللهجات.',
  'ترتيبات وصول لذوي الإعاقة والحالات الموثقة.',
];

const BOOKING_DECISION_ROWS = [
  {
    purpose: 'جامعة أوتسجيل مهني',
    version: 'غالبًا Academic.',
  },
  {
    purpose: 'هجرة عامة',
    version: 'غالبًا General Training، حسب الدولة.',
  },
  {
    purpose: 'مسار UKVI يتطلب SELT',
    version: 'IELTS for UKVI.',
  },
  {
    purpose: 'مسار بريطاني لسماع وتحدث فقط',
    version: 'Life Skills.',
  },
  {
    purpose: 'دراسة من المنزل',
    version: 'IELTS Online Academic، بعد تأكيد قبول الجامعة.',
  },
];

const EXAM_USES_ITEMS = [
  {
    title: '1. القبول الجامعي',
    importance: 'استخدام أساسي',
    description:
      'لإثبات القدرة على الدراسة بالإنجليزية في برامج البكالوريوس والماجستير والدكتوراه والبرامج التحضيرية.',
    icon: GraduationCap,
    accentGold: true,
  },
  {
    title: '2. المنح الدراسية',
    importance: 'استخدام شائع',
    description: 'قد تطلب منحة أو جامعة مستضيفة درجة إجمالية وحدًا أدنى في كل مهارة.',
    icon: Award,
    accentGold: false,
  },
  {
    title: '3. الهجرة',
    importance: 'استخدام أساسي لبعض الدول والمسارات',
    description:
      'تقبل بعض برامج الهجرة في دول مثل المملكة المتحدة وأستراليا وكندا ونيوزيلندا أنواعًا معينة من IELTS وفق شروط كل مسار.',
    icon: Globe,
    accentGold: true,
  },
  {
    title: '4. العمل',
    importance: 'التواصل المهني',
    description: 'قد يطلب صاحب العمل إثبات الكفاءة في التواصل المهني باللغة الإنجليزية.',
    icon: Briefcase,
    accentGold: false,
  },
  {
    title: '5. التسجيل المهني',
    importance: 'حسب المهنة والدولة',
    description:
      'قد تستخدمه هيئات الترخيص في الطب والتمريض والصيدلة والهندسة والتعليم وغيرها، وقد تشترط درجات محددة لكل مهارة.',
    icon: FileCheck,
    accentGold: true,
  },
  {
    title: '6. برامج اللغة والقبول المشروط',
    importance: 'تحديد المسار التمهيدي',
    description:
      'قد تستخدمه مؤسسات تعليمية لتحديد الحاجة إلى برنامج لغة أو مسار تمهيدي (Pre-sessional Course).',
    icon: Languages,
    accentGold: false,
  },
  {
    title: '7. بعض التأشيرات البريطانية',
    importance: 'مسارات SELT المعتمدة',
    description:
      'تتطلب مسارات معينة اختبارًا من فئة IELTS for UKVI أو Life Skills عندما يكون الاختبار الآمن المعتمد (SELT) مطلوبًا.',
    icon: Building2,
    accentGold: true,
  },
];

const MAIN_FOUR_EXAM_TYPES = [
  {
    id: 'academic',
    num: '1',
    title: 'IELTS Academic — الآيلتس الأكاديمي',
    icon: GraduationCap,
    description:
      'مخصص في الأساس للدراسة الجامعية والدراسات العليا وبعض متطلبات التسجيل المهني. تختلف فيه مهام القراءة والكتابة عن النسخة العامة؛ فالقراءة تعتمد على نصوص ذات طابع أكاديمي، وتضم الكتابة مهمة لوصف بيانات أو معلومات مرئية وأخرى لكتابة مقال.',
  },
  {
    id: 'general-training',
    num: '2',
    title: 'IELTS General Training — الآيلتس العام',
    icon: Briefcase,
    description:
      'يُستخدم في بعض أغراض الهجرة والعمل والتدريب والدراسة دون مستوى الدرجة الجامعية. تعتمد القراءة فيه بصورة أكبر على مواقف الحياة اليومية والعمل، وتكون المهمة الأولى في الكتابة رسالة بدل وصف بيانات. الاستماع والمحادثة متماثلان في نسختي Academic وGeneral Training.',
  },
  {
    id: 'ukvi',
    num: '3',
    title: 'IELTS for UKVI — الآيلتس للتأشيرات البريطانية',
    icon: Building2,
    description:
      'هو اختبار معتمد ضمن نظام Secure English Language Test (SELT) لمسارات معينة لدى UK Visas and Immigration، وله نسختان بأربع مهارات: IELTS for UKVI Academic وIELTS for UKVI General Training. يتوافق المحتوى مع النسخة العادية المقابلة، لكن ترتيبات الأمن والتحقق والمراكز المعتمدة تختلف. يجب أداؤه لدى جهة ومركز معتمدين وفق متطلبات المسار، ولا يحل IELTS Online محله.',
  },
  {
    id: 'life-skills',
    num: '4',
    title: 'IELTS for UKVI Life Skills',
    icon: Languages,
    description:
      'يقيس الاستماع والمحادثة فقط، وتكون النتيجة Pass أو Fail بدل Band من 0 إلى 9. يُستخدم في مسارات بريطانية تشترط إثبات القدرة على التواصل الشفهي بمستوى محدد. تستغرق الجلسة نحو 20 دقيقة في العادة، وتُجرى مع ممتحن، وغالبًا بمشاركة متقدم آخر، وتتضمن طلب معلومات وتقديم آراء وتفضيلات ومناقشة مواقف يومية. Life Skills ليس بديلًا عن Academic للقبول الجامعي لأنه لا يقيس القراءة والكتابة.',
    levelsList: [
      { code: 'A1', desc: 'لبعض مسارات تأشيرات الأسرة.' },
      {
        code: 'A2',
        desc: 'لبعض حالات تمديد مسارات الأسرة؛ وتذكر بيانات الملف المرجعي أنه يُتاح داخل المملكة المتحدة وفق شروطه الخاصة.',
      },
      {
        code: 'B1',
        desc: 'لبعض متطلبات الإقامة الدائمة والجنسية أو مسارات أخرى مناسبة.',
      },
    ],
  },
];

const TARGET_GROUPS_ITEMS = [
  'طلاب البكالوريوس.',
  'طلاب الماجستير والدكتوراه.',
  'المتقدمون إلى المنح.',
  'طلاب التبادل الدولي.',
  'المهاجرون.',
  'المتقدمون إلى UK Visas and Immigration.',
  'الأطباء والممرضون والمهنيون.',
  'المتقدمون إلى برامج اللغة والمسارات التحضيرية.',
  'العاملون الراغبون في إثبات الإنجليزية.',
  'من يفضل مقابلة Speaking مع شخص بدل التسجيل على ميكروفون فقط.',
];

const INTERNATIONAL_RECOGNITION_ITEMS = [
  { text: 'يُقدَّم IELTS في أكثر من 140 دولة (وأكثر من 160 دولة في تحديث أكتوبر 2026).', fullWidth: false },
  { text: 'تعترف به أكثر من 12,500 مؤسسة، ويضم أكثر من 4,500 موقع اختبار.', fullWidth: false },
  {
    text: 'يستخدم في المملكة المتحدة والولايات المتحدة وكندا وأستراليا ونيوزيلندا وأوروبا وآسيا والشرق الأوسط.',
    fullWidth: true,
  },
  {
    text: 'القبول الفعلي يجب التحقق منه على مستوى الجامعة والبرنامج والهيئة.',
    fullWidth: false,
  },
  {
    text: 'القبول في بلد ما لا يعني قبول كل طرق التقديم أو جميع أنواع الاختبار فيه.',
    fullWidth: false,
  },
  {
    text: 'بعض الجهات تقبل اختبار المركز ولا تقبل IELTS Online.',
    fullWidth: false,
  },
  {
    text: 'بعض الجهات تقبل النتيجة الكاملة ولا تقبل One Skill Retake.',
    fullWidth: false,
  },
];

const SECTION4_STUDY_SCHOLARSHIP_RANGES = [
  {
    pathway: 'برنامج تأسيسي أو تحضيري',
    commonRange: '4.5–5.5',
    importantNote: 'نطاق تقريبي وارد في الملف المرجعي لبرامج السنة التأسيسية والمسارات التمهيدية.',
  },
  {
    pathway: 'بكالوريوس',
    commonRange: '6.0–6.5',
    importantNote: 'نطاق تقريبي شائع لبرامج الدرجة الجامعية الأولى مع اختلاف شروط كل كلية.',
  },
  {
    pathway: 'ماجستير',
    commonRange: '6.5–7.0',
    importantNote: 'نطاق تقريبي شائع لبرامج الدراسات العليا وقد يرتفع في التخصصات الدقيقة.',
  },
  {
    pathway: 'دكتوراه',
    commonRange: '7.0 أو أعلى في برامج كثيرة',
    importantNote: 'تتطلب برامج بحثية كثيرة حدًا مرتفعًا في الكتابة الأكاديمية والدرجة الإجمالية.',
  },
  {
    pathway: 'طب وتمريض وبعض الهيئات المهنية',
    commonRange: 'حدود مستقلة أكثر صرامة بحسب الهيئة',
    importantNote: 'تشترط هيئات الترخيص المهني عادةً حدًا أدنى صارمًا في كل مهارة من المهارات الأربع.',
  },
];

const YEMEN_CENTER_DETAILS = [
  { label: 'الاسم', value: 'British Council / New Horizons Yemen', fullWidth: true },
  { label: 'المدينة', value: 'عدن', fullWidth: false },
  { label: 'المنطقة', value: 'خور مكسر', fullWidth: false },
  { label: 'العنوان', value: 'Ba Hada Building — Fourth Floor', fullWidth: true },
  { label: 'الحالة', value: 'مركز رسمي ظاهر في IELTS.org', fullWidth: true },
];

const YEMEN_AVAILABLE_EXAMS = ['IELTS Academic.', 'IELTS General Training.'];

const YEMEN_FEES_ROWS = [
  { examType: 'IELTS Academic', fee: '265 دولارًا أمريكيًا' },
  { examType: 'IELTS General Training', fee: '265 دولارًا أمريكيًا' },
];

const YEMEN_STUDENT_NOTES = [
  'السعر قد يتغير ويخضع لضرائب محلية.',
  'شاشة الحجز الرسمية هي المرجع النهائي للأسعار.',
  'اختبار UKVI لم يظهر في صفحة المركز.',
  'توفر One Skill Retake وWriting on Paper وطريقة الكمبيوتر يحتاج إلى التحقق عند الحجز.',
  'الطالب المقيم في صنعاء قد يحتاج إلى السفر إلى عدن لأداء الاختبار.',
  'المتقدمون لاختبار IELTS for UKVI قد يحتاجون إلى السفر إلى دولة أخرى.',
];

const EXAM_FAMILY_VARIANTS = [
  {
    title: 'IELTS Academic',
    description: 'للدراسة الجامعية والدراسات العليا وبعض الهيئات المهنية.',
    icon: GraduationCap,
  },
  {
    title: 'IELTS General Training',
    description: 'للهجرة والعمل والتدريب والدراسة دون مستوى الدرجة الجامعية في كثير من الحالات.',
    icon: Briefcase,
  },
  {
    title: 'IELTS for UKVI Academic',
    description: 'محتوى Academic ضمن إجراءات أمنية ومراكز SELT معتمدة من UKVI.',
    icon: Building2,
  },
  {
    title: 'IELTS for UKVI General Training',
    description: 'محتوى General Training ضمن بيئة SELT معتمدة.',
    icon: FileCheck,
  },
  {
    title: 'IELTS for UKVI Life Skills A1',
    description: 'يقيس Listening وSpeaking فقط لمسارات تتطلب CEFR A1.',
    icon: Languages,
  },
  {
    title: 'IELTS for UKVI Life Skills A2',
    description: 'لمسارات تمديد عائلية محددة؛ متاح داخل المملكة المتحدة فقط وفق الصفحة الرسمية الحالية.',
    icon: Users,
  },
  {
    title: 'IELTS for UKVI Life Skills B1',
    description:
      'للمواطنة البريطانية أوIndefinite Leave to Remain ومسارات أخرى تحتاج B1 في السماع والتحدث.',
    icon: Award,
  },
  {
    title: 'IELTS Online Academic',
    description: 'Academic من المنزل أوحيز خاص في دول محددة، مع مراقبة بشرية وAI.',
    icon: Globe,
  },
  {
    title: 'IELTS One Skill Retake',
    description: 'خدمة لاحقة لإعادة مهارة واحدة من اختبار محوسب مؤهل، وليست نوع اختبار أساسي مستقل.',
    icon: Sparkles,
  },
];

const DATABASE_SEPARATED_FIELDS = [
  'testVariant',
  'deliveryMode',
  'securityScheme',
  'legalPurpose',
  'retakeType',
];

const CHOOSING_RIGHT_VERSION_ROWS = [
  {
    goal: 'بكالوريوس أو ماجستير أو دكتوراه',
    likelyVersion: 'Academic',
    verify: 'درجات البرنامج وسياسة قبول النتائج',
  },
  {
    goal: 'منحة أكاديمية',
    likelyVersion: 'Academic غالبًا',
    verify: 'شروط المنحة والجامعة',
  },
  {
    goal: 'تسجيل مهني',
    likelyVersion: 'Academic غالبًا',
    verify: 'الهيئة ومعدلات كل مهارة',
  },
  {
    goal: 'هجرة',
    likelyVersion: 'Academic أو General بحسب المسار',
    verify: 'الجهة الحكومية ونوع التأشيرة',
  },
  {
    goal: 'مسار بريطاني يتطلب SELT بأربع مهارات',
    likelyVersion: 'IELTS for UKVI',
    verify: 'نوع الاختبار والمستوى والمركز المعتمد',
  },
  {
    goal: 'مسار بريطاني يتطلب السماع والتحدث فقط',
    likelyVersion: 'Life Skills',
    verify: 'المستوى A1 أو A2 أو B1',
  },
  {
    goal: 'عمل أو تدريب عام',
    likelyVersion: 'General Training أو نوع آخر',
    verify: 'شروط الجهة المستقبلة',
  },
  {
    goal: 'دراسة من المنزل',
    likelyVersion: 'IELTS Online Academic',
    verify: 'قبول الجامعة والدولة المدعومة',
  },
];

const COMMON_MISTAKES_ITEMS = [
  'حجز General Training لجامعة تطلب Academic.',
  'حجز IELTS العادي لمسار يشترط UKVI SELT.',
  'حجز IELTS Online لجهة لا تقبله.',
  'افتراض قبول One Skill Retake دون سؤال المؤسسة.',
  'اختيار Life Skills مع أن المسار يحتاج المهارات الأربع.',
];

const UKVI_TYPES_ITEMS = [
  'IELTS for UKVI Academic.',
  'IELTS for UKVI General Training.',
  'Life Skills A1/A2/B1.',
];

const UKVI_BASIC_RULES_ITEMS = [
  'حضوري داخل مركز UKVI معتمد.',
  'تحقق هوية وأمن إضافي.',
  'IELTS Online غير صالح.',
  'من منتصف 2026 سيكون SELT رقميًا بالكامل.',
  'الحكومة البريطانية أكدت استمرار قبول IELTS for UKVI في مارس 2026.',
];

const UKVI_SCORE_TABLE_ROWS = [
  { required: 'B1 بأربع مهارات', limit: '4.0 في كل مهارة' },
  { required: 'B2 بأربع مهارات', limit: '5.5 في كل مهارة' },
  { required: 'C1 بأربع مهارات', limit: '7.0 في كل مهارة' },
];

const UKVI_CURRENT_EXAMPLES_ITEMS = [
  'الدراسة دون مستوى الدرجة: B1 / 4.0 لكل مهارة.',
  'الدراسة بدرجة أوأعلى: B2 / 5.5 لكل مهارة، مع قواعد مؤسسات التعليم العالي.',
  'Skilled Worker الجديد: B2 في حالات منشورة من 8 يناير 2026، مع انتقالات لبعض الموجودين في المسار.',
  'Health and Care Worker الجديد: B2 في حالات منشورة، مع قواعد انتقالية.',
  'المواطنة أوالإقامة الدائمة: Life Skills B1 Pass في المسار المناسب.',
];

const LIFE_SKILLS_RESULTS = ['Pass.', 'Fail.', 'لا توجد Band Scores (0 إلى 9).'];

const LIFE_SKILLS_METHOD_ITEMS = [
  'مع ممتحن.',
  'بمشاركة متقدم آخر غالبًا.',
  'نحو 20 دقيقة في العادة.',
  'طلب معلومات وتقديم آراء وتفضيلات ومناقشة مواقف يومية.',
];

const LIFE_SKILLS_LEVELS = [
  {
    level: 'A1',
    description: 'لبعض مسارات تأشيرات الأسرة (مسارات عائلة شخص مستقر ومسارات أخرى تتطلب A1).',
    fullWidth: false,
  },
  {
    level: 'A2',
    description:
      'لبعض حالات تمديد مسارات الأسرة؛ وتذكر بيانات الملف المرجعي أنه يُتاح داخل المملكة المتحدة وفق شروطه الخاصة.',
    fullWidth: false,
  },
  {
    level: 'B1',
    description:
      'لبعض متطلبات الإقامة الدائمة (Indefinite Leave to Remain) والجنسية البريطانية أو مسارات أخرى مناسبة تحتاج B1 في السماع والتحدث.',
    fullWidth: true,
  },
];

// ============================================================================
// SECTION 5 DATA CONSTANTS: 5. طرق تقديم الاختبار والمتطلبات التقنية
// ============================================================================
const DELIVERY_METHODS_2026 = [
  {
    title: 'IELTS on Computer داخل المركز',
    icon: Monitor,
    bullets: [
      'تُؤدى مهارات الاستماع والقراءة والكتابة على الكمبيوتر داخل مركز رسمي.',
      'تكون المحادثة (Speaking) مع ممتحن معتمد.',
      'تشمل المزايا سرعة ظهور النتائج عادة خلال 1–5 أيام (وغالبًا 1–2 يوم).',
      'إمكانية الاستفادة من One Skill Retake إذا كان الاختبار الأصلي والمركز مؤهلين وتحققت شروط الخدمة.',
    ],
  },
  {
    title: 'IELTS on Computer مع Writing on Paper',
    icon: PenTool,
    bullets: [
      'في دول مختارة، تظهر أسئلة الكتابة على الشاشة لكن يكتب المتقدم الإجابات بالقلم على ورقة مخصصة (IELTS Writing Answer Sheet)، بينما تبقى مهارتا الاستماع والقراءة على الكمبيوتر.',
      'يتوافق محتوى الكتابة ومعاييرها ومدتها مع الطريقة المحوسبة.',
      'تظهر النتيجة خلال نحو خمسة أيام وفق الإعلان الرسمي.',
      'لا يذكر تقرير TRF اختيار هذه الطريقة، ولا تتوفر لـIELTS for UKVI.',
      'عند إعادة كتابة هذه المهارة بخدمة One Skill Retake يجب الحفاظ على طريقة الكتابة الأصلية.',
    ],
  },
  {
    title: 'IELTS Online Academic من المنزل',
    icon: Laptop,
    bullets: [
      'يُسمح بأداء Academic فقط من المنزل أو حيز خاص في الدول المدعومة لمن يبلغ 18 عامًا فأكثر.',
      'تُؤدى الاستماع والقراءة والكتابة على الكمبيوتر، والمحادثة عبر فيديو مباشر مع ممتحن معتمد.',
      'لا يقبل IELTS Online لأغراض الهجرة أو التسجيل المهني، ويجب التأكد من قبول الجامعة للنتيجة قبل الدفع.',
      'نتائج خلال 6–8 أيام، والنتيجة إلكترونية فقط eTRF.',
    ],
  },
  {
    title: 'ماذا عن الاختبار الورقي التقليدي؟ (IELTS on Paper)',
    icon: FileText,
    bullets: [
      'أعلنت IELTS في 5 مارس 2026 أنه ابتداءً من منتصف 2026 ستنتقل تدريجيًا من تقديم الاختبار الورقي المستقل إلى الكمبيوتر، مع اختلاف التوقيت بين الدول.',
      'النتائج الورقية السابقة لا تفقد صلاحيتها بسبب هذا الانتقال (تبقى صالحة خلال فترة السنتين الموصى بها).',
      'يجب الاستعلام عن حالة الخيار المتاح في بلدك من نظام الحجز الحالي بدل الاعتماد على المواعيد القديمة.',
    ],
  },
  {
    title: 'IELTS for UKVI',
    icon: ShieldAlert,
    bullets: [
      'يُقدم داخل مراكز SELT معتمدة فقط.',
      'لا يُقدم عبر IELTS Online ولا Writing on Paper.',
    ],
  },
];

const SECTION5_GUIDE_COMPARISON_ROWS = [
  {
    method: 'IELTS on Computer',
    place: 'مركز رسمي',
    writing: 'لوحة مفاتيح',
    notes: 'بحسب النوع المطلوب',
  },
  {
    method: 'Computer + Writing on Paper',
    place: 'مركز مختار',
    writing: 'بالقلم في Writing',
    notes: 'غير متاح لـUKVI',
  },
  {
    method: 'IELTS Online Academic',
    place: 'المنزل في دولة مدعومة',
    writing: 'لوحة مفاتيح',
    notes: 'تأكد من قبول الجامعة؛ ليس للهجرة أو الترخيص المهني',
  },
  {
    method: 'Paper التقليدي',
    place: 'مركز إذا بقي متاحًا في السوق',
    writing: 'بالقلم',
    notes: 'قيد الإيقاف التدريجي حسب السوق',
  },
];

const DELIVERY_COMPARISON_ROWS = [
  {
    element: 'المكان',
    computerCentre: 'مركز معتمد',
    writingOnPaper: 'مركز معتمد',
    ieltsOnline: 'منزل/مكان خاص',
    paperLegacy: 'مركز معتمد',
  },
  {
    element: 'Academic',
    computerCentre: 'نعم',
    writingOnPaper: 'دول مختارة',
    ieltsOnline: 'نعم',
    paperLegacy: 'يتوقف تدريجيًا',
  },
  {
    element: 'General',
    computerCentre: 'نعم',
    writingOnPaper: 'دول مختارة',
    ieltsOnline: 'لا',
    paperLegacy: 'يتوقف تدريجيًا',
  },
  {
    element: 'UKVI',
    computerCentre: 'في مراكز SELT',
    writingOnPaper: 'لا',
    ieltsOnline: 'لا',
    paperLegacy: 'أوقف في أسواق كثيرة',
  },
  {
    element: 'Writing',
    computerCentre: 'لوحة مفاتيح',
    writingOnPaper: 'ورق وقلم',
    ieltsOnline: 'لوحة مفاتيح',
    paperLegacy: 'ورق وقلم',
  },
  {
    element: 'Speaking',
    computerCentre: 'ممتحن معتمد',
    writingOnPaper: 'ممتحن معتمد',
    ieltsOnline: 'فيديو حي مع ممتحن',
    paperLegacy: 'ممتحن معتمد',
  },
  {
    element: 'النتيجة',
    computerCentre: '1–5 أيام',
    writingOnPaper: 'خلال 5 أيام',
    ieltsOnline: '6–8 أيام',
    paperLegacy: '3–13 يومًا تاريخيًا',
  },
  {
    element: 'One Skill Retake',
    computerCentre: 'نعم في مراكز مدعومة',
    writingOnPaper: 'نعم بشروط',
    ieltsOnline: 'تحقق حسب السوق',
    paperLegacy: 'لا',
  },
  {
    element: 'هجرة',
    computerCentre: 'حسب النسخة والجهة',
    writingOnPaper: 'حسب النسخة والجهة',
    ieltsOnline: 'لا',
    paperLegacy: 'النتائج السارية فقط',
  },
];

const IELTS_ONLINE_SECTIONS = [
  {
    id: 'scope',
    title: 'النطاق',
    icon: Globe,
    items: [
      'لـIELTS Academic فقط.',
      'غير متاح لـGeneral Training.',
      'غير متاح لـUKVI.',
      'غير مخصص للهجرة.',
      'متاح في دول ومناطق محددة.',
      'يجب التأكد من قبول المؤسسة لـIELTS Online بالاسم.',
    ],
  },
  {
    id: 'execution',
    title: 'التنفيذ',
    icon: Video,
    items: [
      'Listening وReading وWriting على الكمبيوتر مع مراقبة بشرية وAI.',
      'Speaking عبر مكالمة فيديو مباشرة مع ممتحن معتمد.',
      'فحص هوية وفحص غرفة 360 درجة.',
      'إغلاق جميع البرامج غير المسموح بها.',
      'متصفح آمن مثل Inspera Exam Portal.',
      'قد يحدد Speaking قبل أو بعد الجزء الكتابي.',
    ],
  },
  {
    id: 'device',
    title: 'المكان والجهاز',
    icon: Laptop,
    items: [
      'غرفة خاصة هادئة ومضاءة جيدًا.',
      'لابتوب أو كمبيوتر مكتبي فقط.',
      'لا يُسمح بالهاتف أو التابلت لأداء الاختبار.',
      'كاميرا وميكروفون ومكبرات صوت أو سماعة وفق التعليمات الرسمية.',
      'إنترنت مستقر.',
      'الهاتف يستخدم لفحص الغرفة ثم يوضع بعيدًا.',
      'جواز السفر الأصلي المستخدم في الحجز.',
    ],
  },
  {
    id: 'during',
    title: 'أثناء الاختبار',
    icon: ShieldAlert,
    items: [
      'يمنع دخول أي شخص للغرفة.',
      'تبقى الكاميرا والميكروفون مفتوحين.',
      'يمنع التحدث بصوت عالٍ في الأقسام الكتابية.',
      'يمنع أخذ ملاحظات خارج النظام.',
      'لا توجد استراحة حمام أثناء الأجزاء الكتابية وفق سياسة IELTS Online.',
      'يسمح بماء في زجاجة شفافة بلا ملصق.',
      'أي مخالفة قد تلغي الاختبار أو تحجب النتيجة.',
    ],
  },
];

const CENTER_FIELDS = [
  'Active.',
  'Temporarily Unavailable.',
  'Closed.',
  'UKVI Approved.',
  'OSR Supported.',
  'Computer Available.',
  'Writing on Paper Available.',
  'Last Verified At.',
];

const CENTER_SCHEDULES = [
  'ليست جدولًا عالميًا.',
  'تتغير حسب السعة.',
  'الكمبيوتر قد يوفر جلسات أكثر.',
  'Speaking قد يحدد منفصلًا.',
];

// ============================================================================
// SECTION 6 DATA CONSTANTS: 6. بنية الاختبار والمدة
// ============================================================================
const EXAM_STRUCTURE_ROWS = [
  {
    skill: 'Listening',
    duration: 'نحو 30 دقيقة',
    count: '40 سؤالًا',
    icon: Headphones,
  },
  {
    skill: 'Reading',
    duration: '60 دقيقة',
    count: '40 سؤالًا',
    icon: BookOpen,
  },
  {
    skill: 'Writing',
    duration: '60 دقيقة',
    count: 'مهمتان',
    icon: PenTool,
  },
  {
    skill: 'Speaking',
    duration: '11–14 دقيقة',
    count: '3 أجزاء',
    icon: Mic,
  },
];

const SPEAKING_TIMING_NOTES = [
  'قد يكون في اليوم نفسه.',
  'قد يكون قبل أوبعد الأقسام الأخرى حسب المركز.',
  'IELTS Online يعقده غالبًا قبل جلسة L/R/W.',
];

// ============================================================================
// SECTION 7 DATA CONSTANTS: 7. الأقسام والمهارات وأنواع الأسئلة
// ============================================================================
const LISTENING_SPECS = [
  { label: 'المدة', value: 'نحو 30 دقيقة.' },
  { label: 'الأسئلة', value: '40.' },
  { label: 'الأجزاء', value: '4، وفي كل جزء 10 أسئلة.' },
  { label: 'التشغيل', value: 'مرة واحدة.' },
  { label: 'الدرجة الخام', value: 'نقطة لكل إجابة صحيحة.' },
  { label: 'النطاق النهائي', value: 'Band 0–9.' },
];

const LISTENING_PARTS = [
  'محادثة اجتماعية يومية.',
  'حديث فردي اجتماعي يومي.',
  'محادثة تعليمية أوتدريبية.',
  'حديث أكاديمي مثل محاضرة.',
];

const LISTENING_QUESTION_TYPES = [
  'Multiple Choice.',
  'Matching.',
  'Plan/Map/Diagram Labelling.',
  'Form/Note/Table/Flow-chart/Summary Completion.',
  'Sentence Completion.',
  'Short-answer Questions.',
];

const LISTENING_RULES = [
  'الإجابات تأتي بترتيب التسجيل.',
  'يجب احترام حد الكلمات.',
  'الإملاء والقواعد قد يؤثران في صحة الإجابة.',
  'تظهر لهجات بريطانية وأسترالية ونيوزيلندية وأمريكية شمالية.',
  'التسجيل لا يعاد.',
];

const LISTENING_CONVERSION_ROWS = [
  { band: '5', raw: '16' },
  { band: '6', raw: '23' },
  { band: '7', raw: '30' },
  { band: '8', raw: '35' },
];

const ACADEMIC_READING_SPECS = [
  { label: 'المدة', value: '60 دقيقة، شاملة إدخال/نقل الإجابات.', fullWidth: true },
  { label: 'الأقسام', value: '3.', fullWidth: false },
  { label: 'الأسئلة', value: '40.', fullWidth: false },
  { label: 'إجمالي طول النصوص', value: 'نحو 2,150–2,750 كلمة.', fullWidth: false },
  { label: 'المصادر', value: 'كتب ودوريات ومجلات وصحف.', fullWidth: false },
];

const ACADEMIC_READING_QUESTION_TYPES = [
  'Multiple Choice.',
  'True/False/Not Given.',
  'Yes/No/Not Given.',
  'Matching Information/Headings/Features/Sentence Endings.',
  'Sentence Completion.',
  'Summary/Note/Table/Flow-chart Completion.',
  'Diagram Label Completion.',
  'Short-answer Questions.',
];

const ACADEMIC_READING_CONVERSION_ROWS = [
  { band: '5', raw: '15' },
  { band: '6', raw: '23' },
  { band: '7', raw: '30' },
  { band: '8', raw: '35' },
];

const GENERAL_READING_SPECS = [
  { label: 'المدة', value: '60 دقيقة.', fullWidth: false },
  { label: 'الأسئلة', value: '40.', fullWidth: false },
  { label: 'الأقسام', value: '3 متدرجة الصعوبة.', fullWidth: true },
];

const GENERAL_READING_SECTIONS = [
  {
    title: 'القسم الأول',
    description:
      'نصان أوثلاثة نصوص قصيرة أوعدة نصوص أصغر من الحياة اليومية، مثل الإعلانات والإشعارات والجداول ومعلومات الخدمات.',
  },
  {
    title: 'القسم الثاني',
    description:
      'نصان مرتبطان بالعمل، مثل الوصف الوظيفي والسياسات والتعليمات والتدريب.',
  },
  {
    title: 'القسم الثالث',
    description: 'نص أطول وأكثر تعقيدًا في موضوع عام.',
  },
];

const GENERAL_READING_CONVERSION_ROWS = [
  { band: '4', raw: '15' },
  { band: '5', raw: '23' },
  { band: '6', raw: '30' },
  { band: '7', raw: '35' },
];

const ACADEMIC_WRITING_SPECS = [
  { label: 'المدة', value: '60 دقيقة.', fullWidth: false },
  { label: 'المهام', value: '2.', fullWidth: false },
  { label: 'طريقة الإجابة', value: 'لوحة مفاتيح أوWriting on Paper أوورقي تاريخي.', fullWidth: true },
  { label: 'Task 2', value: 'يحمل وزنًا مضاعفًا مقارنة بـTask 1.', fullWidth: true },
];

const ACADEMIC_WRITING_TASK1 = [
  'نحو 20 دقيقة.',
  '150 كلمة على الأقل.',
  'وصف أوتلخيص أوشرح Graph أوChart أوTable أوMap أوDiagram أوProcess.',
  'يجب تقديم Overview واضح.',
  'لا تكتب رأيًا شخصيًا ما لم تطلب المهمة ذلك.',
];

const ACADEMIC_WRITING_TASK2 = [
  'نحو 40 دقيقة.',
  '250 كلمة على الأقل.',
  'مقال يناقش رأيًا أوحجة أومشكلة أوأسبابًا وحلولًا أومزايا وعيوب.',
];

const ACADEMIC_WRITING_CRITERIA = [
  'Task Achievement في Task 1 / Task Response في Task 2.',
  'Coherence and Cohesion.',
  'Lexical Resource.',
  'Grammatical Range and Accuracy.',
];

const ACADEMIC_WRITING_RULES = [
  'المعايير الأربعة متساوية الوزن داخل المهمة.',
  'Task 2 أثقل في الدرجة النهائية.',
  'الإجابة القصيرة تتأثر.',
  'يجب استخدام جمل وفقرات كاملة.',
  'النص غير المرتبط بالمهمة يتعرض لعقوبة كبيرة.',
  'الكلمات المنسوخة من السؤال لا تُحسب بوصفها إنتاجًا مفيدًا.',
];

const GENERAL_WRITING_SPECS = [
  { label: 'المدة', value: '60 دقيقة.', fullWidth: false },
  { label: 'المهام', value: '2.', fullWidth: false },
  { label: 'Task 2', value: 'يحمل ضعف وزن Task 1.', fullWidth: true },
];

const GENERAL_WRITING_TASK1 = [
  'نحو 20 دقيقة.',
  '150 كلمة على الأقل.',
  'استجابة لموقف مثل طلب معلومات أوشكوى أواعتذار أوشرح موقف أودعوة.',
  'النبرة رسمية أوشبه رسمية أوشخصية.',
  'يجب تغطية النقاط المطلوبة.',
];

const GENERAL_WRITING_TASK2 = [
  'نحو 40 دقيقة.',
  '250 كلمة على الأقل.',
  'مقال عن قضية أوحجة أورأي أوحل مشكلة.',
];

const GENERAL_WRITING_CRITERIA = [
  'Task Achievement/Response.',
  'Coherence and Cohesion.',
  'Lexical Resource.',
  'Grammatical Range and Accuracy.',
];

const SPEAKING_SPECS = [
  { label: 'المدة', value: '11–14 دقيقة.', fullWidth: false },
  { label: 'الأجزاء', value: '3.', fullWidth: false },
  { label: 'الطريقة', value: 'مقابلة مسجلة مع ممتحن IELTS معتمد.', fullWidth: true },
  { label: 'المحتوى', value: 'متطابق في Academic وGeneral Training.', fullWidth: true },
];

const SPEAKING_PART2_BULLETS = [
  'بطاقة موضوع.',
  'دقيقة للتحضير.',
  'حديث 1–2 دقيقة.',
  'سؤال أواثنان بعد الحديث.',
];

const SPEAKING_CRITERIA = [
  'Fluency and Coherence.',
  'Lexical Resource.',
  'Grammatical Range and Accuracy.',
  'Pronunciation.',
];

const SPEAKING_RULES = [
  'المعايير متساوية الوزن.',
  'لا يشترط تقليد لهجة بريطانية.',
  'الوضوح والتنغيم والتفاعل أهم من اللهجة.',
  'الإجابات المحفوظة قد تقلل طبيعية الأداء.',
  'الاختبار قد يكون حضوريًا أوVideo Call مع ممتحن بشري حسب المركز.',
];

const SECTION7_SKILL_TABS = [
  { id: 0, title: 'قسم الاستماع — Listening', shortTitle: 'Listening', icon: Headphones },
  { id: 1, title: 'القراءة الأكاديمية — Academic Reading', shortTitle: 'Academic Reading', icon: BookOpen },
  { id: 2, title: 'القراءة العامة — General Training Reading', shortTitle: 'General Reading', icon: FileText },
  { id: 3, title: 'الكتابة الأكاديمية — Academic Writing', shortTitle: 'Academic Writing', icon: PenTool },
  { id: 4, title: 'الكتابة العامة — General Training Writing', shortTitle: 'General Writing', icon: Layers },
  { id: 5, title: 'المحادثة — Speaking', shortTitle: 'Speaking', icon: Mic },
];

// ============================================================================
// SECTION 8 DATA CONSTANTS: 8. نظام الدرجات وتفسيرها
// ============================================================================
const ROUNDING_RULES = [
  { code: '.25', text: 'يُرفع إلى النصف التالي.' },
  { code: '.75', text: 'يُرفع إلى العدد الصحيح التالي.' },
  { code: '', text: 'غير ذلك يُقرّب لأقرب عدد صحيح أونصف.' },
];

const OFFICIAL_SCORING_EXAMPLES = [
  { l: '6.5', r: '6.5', w: '5.0', s: '7.0', avg: '6.25', overall: '6.5' },
  { l: '4.0', r: '3.5', w: '4.0', s: '4.0', avg: '3.875', overall: '4.0' },
  { l: '6.5', r: '6.5', w: '5.5', s: '6.0', avg: '6.125', overall: '6.0' },
];

const RAW_SCORE_CONVERSION_TABLES = [
  {
    id: 'listening',
    title: 'Listening',
    icon: Headphones,
    rows: [
      { band: '5', raw: '16' },
      { band: '6', raw: '23' },
      { band: '7', raw: '30' },
      { band: '8', raw: '35' },
    ],
  },
  {
    id: 'academic_reading',
    title: 'Academic Reading',
    icon: BookOpen,
    rows: [
      { band: '5', raw: '15' },
      { band: '6', raw: '23' },
      { band: '7', raw: '30' },
      { band: '8', raw: '35' },
    ],
  },
  {
    id: 'general_reading',
    title: 'General Training Reading',
    icon: FileText,
    rows: [
      { band: '4', raw: '15' },
      { band: '5', raw: '23' },
      { band: '6', raw: '30' },
      { band: '7', raw: '35' },
    ],
  },
];

const RAW_CONVERSION_IMPORT_RULES = [
  { text: 'الجداول تقريبية.', code: '' },
  { text: 'لا تحول Raw Score بجدول ثابت نهائي.', code: '' },
  { text: 'استخدم', code: 'scoreConversionVersion', suffix: '.' },
  { text: 'اعرض تنبيه اختلاف الحدود بين النماذج.', code: '' },
];

const BAND_SCORE_DESCRIPTIONS = [
  { band: '9', name: 'Expert', description: 'تحكم كامل ودقيق وطليق' },
  { band: '8', name: 'Very Good', description: 'تحكم قوي مع أخطاء عرضية' },
  { band: '7', name: 'Good', description: 'تحكم عملي جيد مع بعض الأخطاء' },
  { band: '6', name: 'Competent', description: 'استخدام فعال رغم بعض الأخطاء' },
  { band: '5', name: 'Modest', description: 'تحكم جزئي مع أخطاء كثيرة' },
  { band: '4', name: 'Limited', description: 'قدرة أساسية محدودة' },
  { band: '3', name: 'Extremely Limited', description: 'معنى عام في مواقف مألوفة جدًا' },
  { band: '2', name: 'Intermittent', description: 'صعوبة كبيرة في الفهم والاستخدام' },
  { band: '1', name: 'Non-user', description: 'كلمات منفصلة قليلة' },
  { band: '0', name: 'Did Not Attempt', description: 'لم يحاول الإجابة' },
];

// ============================================================================
// SECTION 9 DATA CONSTANTS: 9. CEFR والدرجات المطلوبة والمقارنات
// ============================================================================
const CEFR_OFFICIAL_GUIDELINES = [
  'حد C1 يقع بين Band 6.5 و7.',
  'الجهة التي تريد ثقة أعلى في C1 قد تطلب 7.',
  'Band 8 يقع على حدود C2.',
  'Band 8.5 فأعلى يُعترف به كـC2 في خريطة IELTS.',
  'الجداول غالبًا للـOverall، لا لكل مهارة تلقائيًا.',
];

const CEFR_SCORE_MAPPING_FIELDS = [
  { key: 'sourceScale', value: 'IELTS' },
  { key: 'targetFramework', value: 'CEFR' },
  { key: 'mappingType', value: 'indicative' },
  { key: 'exactEquivalence', value: 'false' },
];

const TARGET_REQUIRED_SCORES_ROWS = [
  { target: 'برنامج تأسيسي أوStudy Pathway', range: '4.5–5.5', icon: Compass },
  { target: 'بكالوريوس', range: '6.0–6.5', icon: GraduationCap },
  { target: 'ماجستير', range: '6.5–7.0', icon: Award },
  { target: 'دكتوراه', range: '7.0 أوأعلى في برامج كثيرة', icon: BookOpen },
  { target: 'طب وتمريض وتسجيل مهني', range: 'حدود مهارية صارمة غالبًا', icon: FileCheck },
  { target: 'قانون وإعلام ولغات', range: 'Writing/Speaking أعلى أحيانًا', icon: Languages },
];

const INSTITUTIONAL_CONDITION_EXAMPLES = [
  'Overall 6.5 + كل مهارة 6.0.',
  'Overall 7.0 + Writing 6.5.',
  'كل مهارة 7.0 لهيئة مهنية.',
  'قبول أوعدم قبول OSR.',
  'قبول Test Centre ورفض Online.',
];

// --- Section 10: النتائج والتقارير والشهادات ---
const RESULTS_TIMING_DATA = [
  { method: 'IELTS on Computer', duration: '1–5 أيام', icon: Monitor },
  { method: 'معظم نتائج Computer', duration: 'غالبًا 1–2 يوم', icon: Clock },
  { method: 'Writing on Paper', duration: 'خلال 5 أيام', icon: PenTool },
  { method: 'IELTS on Paper', duration: 'حتى 13 يومًا', icon: FileText },
  { method: 'IELTS Online', duration: '6–8 أيام', icon: Laptop },
  { method: 'IELTS for UKVI', duration: '1–5 أيام', icon: ShieldAlert },
  { method: 'UKVI Life Skills', duration: 'حتى 7 أيام', icon: Award },
  { method: 'One Skill Retake', duration: '3–5 أيام', icon: Layers },
];

const JULY_2026_TRF_UPDATE_ITEMS = [
  'إضافة شعار Ofqual.',
  'إضافة اسم المؤهل المنظم.',
  'يشمل TRF الرقمي والورقي.',
  'التقارير القديمة والجديدة صالحة.',
  'لا يلزم إعادة إرسال التقرير القديم.',
  'من حصل على TRF بين يونيو 2024 و14 يوليو 2026 يمكنه طلب تصميم محدث مجانًا.',
  'إعادة الإصدار لا تعيد بدء مدة الصلاحية.',
];

const VALIDITY_ITEMS = [
  'موصى بها سنتان.',
  'المؤسسة قد تقبل مدة أطول.',
  'خدمة التحقق قد تعرض تقارير أقدم، لكن IELTS لا تحقق بصورة موسعة في تقارير تجاوزت ثلاث سنوات.',
];

const STUDENT_SHARING_ITEMS = [
  'مشاركة eTRF إلكترونيًا.',
  'طلب إرسال النتيجة إلى المؤسسات.',
  'استخدام TRF الورقي عند توفره.',
];

const PRIVACY_ITEMS = [
  'لا تعرض رقم TRF علنًا.',
  'لا تحفظ صورة الجواز في السجل العام.',
  'أصل النتيجة يستخدم AssetId.',
  'مشاركة النتيجة بإذن الطالب.',
  'سجل عمليات التحقق.',
];

// --- Section 11: التسجيل والأهلية والهوية ---
const OFFICIAL_REGISTRATION_STEPS = [
  { step: 1, text: 'حدد الهدف.', icon: Compass },
  { step: 2, text: 'استخرج متطلب الجامعة أوالهجرة.', icon: Search },
  { step: 3, text: 'اختر Academic أوGeneral أوUKVI أوLife Skills.', icon: Layers },
  { step: 4, text: 'اختر طريقة التقديم المقبولة.', icon: Monitor },
  { step: 5, text: 'ابحث عن مركز رسمي.', icon: MapPin },
  { step: 6, text: 'تحقق من OSR وWriting on Paper وOnline عند الحاجة.', icon: CheckCircle2 },
  { step: 7, text: 'اختر الموعد.', icon: CalendarCheck },
  { step: 8, text: 'أدخل الاسم كما في الهوية.', icon: PenTool },
  { step: 9, text: 'قدم الوثيقة المطلوبة.', icon: FileText },
  { step: 10, text: 'ادفع الرسم.', icon: Briefcase },
  { step: 11, text: 'احفظ التأكيد.', icon: Bookmark },
  { step: 12, text: 'تحقق من موعد Speaking.', icon: Mic },
  { step: 13, text: 'راجع التعليمات.', icon: BookOpen },
  { step: 14, text: 'شارك النتيجة مع المؤسسات.', icon: Building2 },
];

const IDENTITY_ELIGIBILITY_CARDS = [
  {
    id: 'identity',
    title: 'الهوية',
    icon: FileCheck,
    items: [
      'أصلية وسارية.',
      'مطابقة للتسجيل.',
      'النوع يختلف حسب الدولة والمركز.',
      'الجواز هو الخيار الأكثر أمانًا خارج بلد الجنسية.',
      'تُحضر الوثيقة نفسها يوم الاختبار.',
    ],
  },
  {
    id: 'name',
    title: 'الاسم',
    icon: PenTool,
    items: [
      'يجب أن يطابق الوثيقة حرفيًا.',
    ],
  },
  {
    id: 'age',
    title: 'العمر',
    icon: Users,
    items: [
      'الاختبار مصمم أساسًا للبالغين والمتقدمين للدراسة والعمل والهجرة.',
      'لا ينصح عادة لمن دون 16 سنة.',
      'القاصر قد يحتاج موافقات محلية.',
      'IELTS Online لعمر 18 سنة فأكثر.',
    ],
  },
  {
    id: 'sensitive_data',
    title: 'البيانات الحساسة',
    icon: ShieldAlert,
    items: [
      'رقم الجواز، صورة الهوية، صورة يوم الاختبار، رقم TRF، التسجيلات والبيانات البيومترية.',
    ],
  },
  {
    id: 'protection',
    title: 'الحماية',
    icon: Server,
    items: [
      'تشفير وصلاحيات محدودة وعدم ظهور في الصفحة العامة.',
    ],
  },
];

// --- Section 12: الرسوم والسياسات المالية ---
const GENERAL_CANCELLATION_POLICY_ITEMS = [
  'يمكن تغيير الموعد قبل الاختبار.',
  'قرب الطلب من الموعد يحدد هل يعامل كنقل أوإلغاء.',
  'التاريخ الجديد خلال 3 أشهر من الأصلي.',
  'نقل الحجز نفسه مرة واحدة.',
  'الرسوم والاسترداد تختلف حسب الشريك والدولة.',
  'الظروف الاستثنائية تحتاج أدلة.',
];

const UKVI_REFUND_TABLE = [
  { timing: 'أكثر من 14 يومًا', refund: '75%' },
  { timing: 'بين 14 يومًا ويومين', refund: '50%' },
  { timing: 'خلال يومين', refund: '25%' },
  { timing: 'يوم الاختبار أوبعده', refund: 'لا استرداد' },
];

const UKVI_TRANSFER_ITEMS = [
  'تاريخ جديد خلال 3 أشهر.',
  'نقل واحد.',
  'قد تفرض رسوم إدارة تصل إلى 25%.',
];

const FEE_VARIATION_FACTORS = [
  'الدولة والمدينة والمركز.',
  'Academic أوGeneral.',
  'UKVI أوLife Skills.',
  'IELTS Online.',
  'الضرائب.',
  'طريقة التقديم.',
  'OSR وEOR.',
  'خدمات تغيير الموعد والإرسال.',
];

const FEE_DO_NOT_ITEMS = [
  'لا تثبت سعرًا عالميًا.',
  'لا تعتبر سعر مركز سعر الدولة كلها.',
  'لا تخلط العادي وUKVI.',
  'لا تنفذ دفعًا داخليًا حاليًا.',
];

const FEE_YAML_MODEL = `fee:
  testVariantId: ielts_academic
  deliveryMode: computer_centre
  centreId: centre_id
  amountMinor: "0"
  currencyCode: USD
  effectiveFrom: null
  lastVerifiedAt: null`;

// --- Section 13: إعادة الاختبار ومراجعة الدرجات ---
const OSR_ADDITIONAL_INFO_ITEMS = [
  'تذكر IELTS أن One Skill Retake متاح حاليًا في أكثر من 110 دول حيث يتوفر IELTS، مع استمرار اختلاف الإتاحة حسب المركز والدولة؛ لذلك يجب التحقق من مركز الاختبار قبل الاعتماد عليه.',
  'يبقى الشرط الأساسي: إجراء اختبار كامل مؤهل في مركز يدعم الخدمة، ثم إعادة مهارة واحدة فقط خلال 60 يومًا من الاختبار الأصلي.',
];

const OSR_ELIGIBILITY_ITEMS = [
  'اختبار كامل سابق على الكمبيوتر.',
  'مركز يدعم OSR.',
  'الإعادة خلال 60 يومًا.',
  'مرة واحدة لكل اختبار أصلي.',
];

const OSR_RESULT_ITEMS = [
  'TRF جديدة.',
  'الدرجة الجديدة + الدرجات الأصلية للمهارات الأخرى.',
  'TRF الأصلية تبقى متاحة.',
  'يمكن اختيار التقرير المستخدم.',
  'النتيجة خلال 3–5 أيام.',
  'الرسم يختلف حسب المركز.',
];

const OSR_ACCEPTANCE_ITEMS = [
  'ليس كل جامعة أوحكومة أوهيئة تقبلها.',
  'تحقق قبل الدفع.',
  'خزّن القبول كحقل مستقل.',
];

const EOR_DETAILS_ITEMS = [
  'يمكن طلب مهارة أوأكثر.',
  'المهلة الشائعة لدى British Council وIDP: 6 أسابيع من تاريخ الاختبار.',
  'الرسم يحدده المركز.',
  'يُسترد إذا تغير Band في أي قسم مراجع.',
  'يقوم مصححون كبار بإعادة التقييم.',
  'تصدر TRF جديدة عند تغير النتيجة.',
  'بعض إرشادات الشركاء تذكر مدة تصل إلى 21 يومًا.',
];

const EOR_VS_OSR_COMPARISON = [
  { element: 'الإجراء', eor: 'إعادة تصحيح', osr: 'إعادة أداء' },
  { element: 'المادة', eor: 'الإجابة الأصلية', osr: 'اختبار جديد' },
  { element: 'المهلة', eor: 'عادة 6 أسابيع', osr: '60 يومًا' },
  { element: 'القبول', eor: 'نتيجة مصححة', osr: 'تحقق من قبول OSR' },
];

// Section 14: يوم الاختبار والقواعد والأمن والتسهيلات
const ONLINE_PRIVACY_RETENTION = [
  {
    scope: 'تسجيلات الصوت والفيديو لأقسام Listening وReading وWriting',
    duration: '60 يومًا بعد الاختبار.',
  },
  {
    scope: 'فيديو Speaking',
    duration: '3 أشهر بعد الاختبار.',
  },
  {
    scope: 'تسجيل صوت Speaking',
    duration: '3 سنوات بعد الاختبار.',
  },
];

const TEST_DAY_BEFORE_ARRIVAL = [
  'راجع التاريخ والوقت والمكان.',
  'تحقق من Speaking.',
  'أحضر الهوية الأصلية.',
  'احضر مبكرًا.',
];

const TEST_DAY_MATERIALS = [
  'الهاتف مغلق ومحفوظ.',
  'الساعة الذكية ممنوعة.',
  'القاموس والملاحظات ممنوعان.',
  'الأجهزة ممنوعة.',
  'الماء الشفاف حسب المركز.',
];

const TEST_DAY_DURING_EXAM = [
  'لا تواصل.',
  'لا أدوات مساعدة أوAI.',
  'لا تصوير أوإخراج مواد.',
  'أبلغ عن المشكلة التقنية فورًا.',
];

const ACCESS_ARRANGEMENTS_EXAMPLES = [
  'وقت إضافي.',
  'Large Print وModified Large Print.',
  'Braille.',
  'Lip-reading.',
  'قاعة منفصلة.',
  'كمبيوتر دون أدوات تصحيح.',
  'Screen Magnifier.',
  'Coloured Overlay.',
  'Transcriber.',
  'تعديل ورقة الإجابة.',
  'استراحات.',
  'إعفاء معتمد من مكوّن أواثنين.',
];

const COMPLAINT_STEPS = [
  { step: '1', text: 'مركز الاختبار أولًا.' },
  { step: '2', text: 'IELTS عند تعذر الحل.' },
  { step: '3', text: 'تأكيد الاستلام خلال 5 أيام عمل عند الإحالة.' },
  { step: '4', text: 'الرد الكامل عادة خلال 20 يوم عمل.' },
];

const COMPLAINT_VS_EOR_VS_SPECIAL = [
  { type: 'الشكوى', desc: 'الخدمة والظروف.' },
  { type: 'EOR', desc: 'الدرجة.' },
  { type: 'Special Consideration', desc: 'ظرف أثر على الأداء.' },
];

// Section 15: التحضير والمصادر والأسئلة الشائعة
const MANARATAK_PREP_ORGANIZATION = [
  'اختبار تشخيصي.',
  'نماذج حسب النسخة.',
  'تدريبات حسب نوع السؤال.',
  'خطة Band.',
  'سجل أخطاء.',
  'محاكاة.',
  'تدريب الكمبيوتر.',
  'تدريب Writing on Paper.',
  'دليل يوم الاختبار.',
  'دليل النتيجة وOSR وEOR.',
];

const COPYRIGHT_RULES = [
  'لا تعِد استضافة الأسئلة دون ترخيص.',
  'الملفات عبر Phase 05 AssetId.',
  'الروابط الرسمية كسجلات قابلة للتحقق.',
];

const PREP_12_WEEKS_PLAN = [
  { step: '1', text: 'تشخيص وبنية.' },
  { step: '2', text: 'أسبوعان Listening.' },
  { step: '3', text: 'أسبوعان Reading.' },
  { step: '4', text: 'أسبوعان Writing Task 1.' },
  { step: '5', text: 'أسبوعان Writing Task 2.' },
  { step: '6', text: 'Speaking.' },
  { step: '7', text: 'اختبارات كاملة.' },
  { step: '8', text: 'معالجة أخطاء.' },
];

const PREP_PRINCIPLES = [
  'Writing وفق Band Descriptors.',
  'Speaking بتسجيل ذاتي.',
  'لا تحفظ مقالات.',
  'تدرب على الكمبيوتر.',
  'نفذ محاكاة دون قاموس أوهاتف.',
];

const IELTS_FAQS = [
  { id: 1, q: 'هل IELTS مناسب للجامعة؟', a: 'نعم، وعادة Academic، مع التحقق من البرنامج.' },
  { id: 2, q: 'الفرق بين Academic وGeneral؟', a: 'Reading وWriting مختلفان، وListening وSpeaking متطابقان.' },
  { id: 3, q: 'هل الورقي توقف؟', a: 'يجري إيقافه تدريجيًا من منتصف 2026 حسب السوق.' },
  { id: 4, q: 'ما Writing on Paper؟', a: 'اختبار محوسب مع كتابة Writing بالقلم.' },
  { id: 5, q: 'هل يظهر في TRF؟', a: 'لا.' },
  { id: 6, q: 'هل هو متاح لـUKVI؟', a: 'لا.' },
  { id: 7, q: 'المدة؟', a: 'نحو ساعتين و45 دقيقة.' },
  { id: 8, q: 'عدد الأسئلة؟', a: '40 Listening، و40 Reading، ومهمتان Writing، وثلاثة أجزاء Speaking.' },
  { id: 9, q: 'كيف يحسب Overall؟', a: 'متوسط الأربع مع التقريب لنصف Band.' },
  { id: 10, q: 'هل توجد درجة نجاح؟', a: 'لا.' },
  { id: 11, q: 'الصلاحية؟', a: 'سنتان موصى بها.' },
  { id: 12, q: 'نتيجة الكمبيوتر؟', a: '1–5 أيام، وغالبًا 1–2.' },
  { id: 13, q: 'إعادة مهارة؟', a: 'OSR عند الأهلية.' },
  { id: 14, q: 'هل كل جامعة تقبل OSR؟', a: 'لا.' },
  { id: 15, q: 'EOR؟', a: 'إعادة تقييم الإجابة الأصلية.' },
  { id: 16, q: 'Online للهجرة أوالتسجيل المهني؟', a: 'لا.' },
  { id: 17, q: 'العمر الأدنى Online؟', a: '18 سنة.' },
  { id: 18, q: 'UKVI من المنزل؟', a: 'لا.' },
  { id: 19, q: 'Life Skills؟', a: 'Listening وSpeaking بنظام Pass/Fail.' },
  { id: 20, q: 'القاموس؟', a: 'ممنوع.' },
  { id: 21, q: 'نقاط سالبة؟', a: 'لا في Listening وReading.' },
  { id: 22, q: 'مركز اليمن؟', a: 'مركز رسمي في عدن.' },
  { id: 23, q: 'السعر الظاهر؟', a: '265 دولارًا لـAcademic أوGeneral في 02 أغسطس 2026.' },
  { id: 24, q: 'هل 6.5 يكفي لكل جامعة؟', a: 'لا.' },
];

const SIMILAR_TESTS = [
  'TOEFL iBT.',
  'PTE Academic.',
  'Duolingo English Test.',
  'Cambridge C1 Advanced.',
  'Cambridge C2 Proficiency.',
  'Linguaskill.',
  'Oxford Test of English.',
  'LanguageCert Academic.',
];

const SUGGESTED_COMPARISONS = [
  'IELTS Academic مقابل TOEFL iBT.',
  'IELTS Academic مقابل PTE Academic.',
  'IELTS مقابل Duolingo English Test.',
  'Academic مقابل General Training.',
  'IELTS العادي مقابل UKVI.',
  'Computer مقابل Writing on Paper.',
  'Test Centre مقابل IELTS Online.',
  'Full Retake مقابل One Skill Retake.',
  'OSR مقابل EOR.',
];

const SKILL_TRAINING_CARDS = [
  {
    id: 'listening',
    skill: 'الاستماع (Listening)',
    icon: Headphones,
    description:
      'تدرّب على تتبع المعنى مع الأسئلة، والتنبؤ بنوع الإجابة، والانتباه إلى إعادة الصياغة والمشتتات، وضبط الإملاء وحدود الكلمات.',
  },
  {
    id: 'reading',
    skill: 'القراءة (Reading)',
    icon: BookOpen,
    description:
      'اجمع بين المسح السريع (Skimming) والبحث عن المعلومات (Scanning) والقراءة الدقيقة للفقرة المستهدفة. ميّز جيدًا بين False/No وبين Not Given، ووزع الستين دقيقة على النصوص الثلاثة.',
  },
  {
    id: 'writing',
    skill: 'الكتابة (Writing)',
    icon: PenTool,
    description:
      'في Academic Task 1 ركّز على Overview واضح ومقارنة الاتجاهات المهمة دون رأي شخصي. وفي General Task 1 التزم بنبرة الرسالة وجميع نقاط السؤال. أما Task 2 فيحتاج موقفًا واضحًا، وتنظيمًا منطقيًا للفقرات، وتنوعًا لغويًا طبيعيًا، ومراجعة للأخطاء، مع إعطاء Task 2 وزنها الزمني المناسب.',
  },
  {
    id: 'speaking',
    skill: 'المحادثة (Speaking)',
    icon: Mic,
    description:
      'تدرّب على الإجابة المباشرة ثم التوسع بسبب أو مثال، واستغل دقيقة التحضير في Part 2 لكتابة كلمات مفتاحية تساعدك على التحدث المتماسك، وفي Part 3 ناقش الأفكار الأوسع والأسباب والنتائج بهدوء ووضوح.',
  },
];

const RETAKE_DECISION_SUMMARY_ROWS = [
  {
    caseDesc: 'تؤدي المهارات كلها مجددًا',
    option: 'إعادة الاختبار كاملًا',
    verify: 'عندما تحتاج رفع أكثر من مهارة أو تفتقد أهلية OSR',
  },
  {
    caseDesc: 'تعيد مهارة واحدة فقط',
    option: 'One Skill Retake',
    verify: 'عندما تكون مهارة واحدة هي العائق والجهة تقبل الإعادة',
  },
  {
    caseDesc: 'تطلب إعادة تقييم الإجابات القديمة',
    option: 'EOR',
    verify: 'عندما ترى أن النتيجة تستحق مراجعة رسمية',
  },
];

const OFFICIAL_LINKS_CATEGORIES = [
  {
    id: 'official-types',
    title: 'الموقع الرسمي والأنواع',
    icon: Globe,
    links: [
      { label: 'موقع IELTS الرسمي', url: 'https://ielts.org/' },
      { label: 'أنواع اختبار IELTS', url: 'https://ielts.org/take-a-test/test-types' },
      {
        label: 'IELTS Academic',
        url: 'https://ielts.org/take-a-test/test-types/ielts-academic-test',
      },
      {
        label: 'IELTS General Training',
        url: 'https://ielts.org/take-a-test/test-types/ielts-general-training-test',
      },
      {
        label: 'IELTS for UKVI',
        url: 'https://ielts.org/take-a-test/test-types/ielts-tests-for-uk-visas-and-immigration',
      },
      {
        label: 'IELTS for UKVI Life Skills',
        url: 'https://ielts.org/take-a-test/test-types/ielts-tests-for-uk-visas-and-immigration/ielts-life-skills-test',
      },
      {
        label: 'IELTS Online Academic',
        url: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-online',
      },
      {
        label: 'متطلبات التأشيرات البريطانية SELT من GOV.UK',
        url: 'https://www.gov.uk/guidance/prove-your-english-language-abilities-with-a-secure-english-language-test-selt',
      },
    ],
  },
  {
    id: 'sections-scoring',
    title: 'الأقسام والدرجات',
    icon: BarChart3,
    links: [
      {
        label: 'Listening',
        url: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-listening',
      },
      {
        label: 'Academic Reading',
        url: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading',
      },
      {
        label: 'Academic Writing',
        url: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-writing',
      },
      {
        label: 'Speaking',
        url: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking',
      },
      {
        label: 'General Training Reading',
        url: 'https://ielts.org/take-a-test/test-types/ielts-general-training-test/ielts-general-training-format-reading',
      },
      {
        label: 'General Training Writing',
        url: 'https://ielts.org/take-a-test/test-types/ielts-general-training-test/ielts-general-training-format-writing',
      },
      {
        label: 'نظام درجات IELTS',
        url: 'https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail',
      },
      {
        label: 'الحصول على النتائج ومشاركتها',
        url: 'https://ielts.org/take-a-test/your-results/getting-and-sharing-your-results',
      },
    ],
  },
  {
    id: 'booking-results-prep',
    title: 'الحجز والنتائج والتحضير',
    icon: CalendarCheck,
    links: [
      { label: 'البحث عن مراكز IELTS', url: 'https://ielts.org/test-centres' },
      {
        label: 'مركز British Council / New Horizons في عدن',
        url: 'https://ielts.org/test-centres/british-council-new-horizons-yemen',
      },
      {
        label: 'One Skill Retake',
        url: 'https://ielts.org/take-a-test/booking-your-test/one-skill-retake',
      },
      {
        label: 'سياسات الإلغاء والاسترداد والمراجعة ونقل الموعد',
        url: 'https://ielts.org/take-a-test/booking-your-test/cancellations-refunds-remarks-transfers',
      },
      {
        label: 'نماذج ومصادر التحضير الرسمية',
        url: 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions',
      },
    ],
  },
];

const KEY_2026_UPDATES_CARDS = [
  {
    id: 'paper-transition',
    title: 'انتقال الاختبار الورقي إلى الكمبيوتر',
    dateBadge: '5 مارس 2026',
    description:
      'في 5 مارس 2026 أعلنت IELTS وقف تقديم الاختبار الورقي المستقل تدريجيًا من منتصف 2026، مع اختلاف التنفيذ بين الأسواق. ويُقدَّم خيار Writing on Paper في دول مختارة دون تغيير المهارات أو أسس التقييم.',
    linkLabel: 'الإعلان الرسمي',
    linkUrl: 'https://ielts.org/news-and-insights/updates-to-ielts-test-delivery',
  },
  {
    id: 'trf-redesign',
    title: 'تحديث تقرير النتيجة',
    dateBadge: '15 يوليو 2026',
    description:
      'بدأ تغيير تصميم Test Report Form في 15 يوليو 2026، مع استمرار صلاحية التقارير القديمة.',
    linkLabel: 'تفاصيل تحديث التقرير',
    linkUrl: 'https://ielts.org/news-and-insights/changes-to-test-report-forms',
  },
  {
    id: 'osr-updates',
    title: 'إعادة مهارة واحدة',
    dateBadge: '60 يومًا',
    description:
      'تسمح One Skill Retake للمرشح المؤهل بإعادة مهارة واحدة خلال 60 يومًا من الاختبار الأصلي لدى مركز مدعوم، مع ضرورة التحقق من قبول المؤسسة.',
    linkLabel: 'السياسة الرسمية',
    linkUrl: 'https://ielts.org/take-a-test/booking-your-test/one-skill-retake',
  },
];

const BEFORE_BOOKING_5_CHECKS = [
  { num: 1, title: 'النسخة الصحيحة', detail: 'Academic أو General أو UKVI أو Life Skills.' },
  { num: 2, title: 'الدرجة الإجمالية وحد كل مهارة', detail: 'Overall والحد الأدنى لكل مهارة مطلوبة.' },
  { num: 3, title: 'طريقة التقديم المقبولة', detail: 'داخل مركز معتمد أو IELTS Online عند قبوله.' },
  { num: 4, title: 'المركز والسعر والموعد', detail: 'من صفحة الحجز الرسمية لبلدك أو أقرب دولة متاحة.' },
  { num: 5, title: 'صلاحية النتيجة وسياسة الإعادة', detail: 'تأكد من صلاحية النتيجة وقبول One Skill Retake لدى الجهة التي ستقدم إليها.' },
];

export const ExamDetailModal: React.FC<ExamDetailModalProps> = ({
  exam,
  onClose,
  isFavorite = false,
  onToggleFavorite,
  searchAnchor,
  searchTerm,
}) => {
  useDetailSearchTarget(searchAnchor, searchTerm);
  const { t: publicT, dir: publicDir } = usePublicTemplateTranslation();
  const [saveToast, setSaveToast] = useState(false);

  // Interactive states for Sections 1–16
  const [section1RefViewMode, setSection1RefViewMode] = useState<'swipe' | 'grid'>('swipe');
  const [skillTrainViewMode, setSkillTrainViewMode] = useState<'swipe' | 'grid'>('swipe');
  const [officialLinksViewMode, setOfficialLinksViewMode] = useState<'tabs' | 'all'>('tabs');
  const [activeOfficialLinksTab, setActiveOfficialLinksTab] = useState<number>(0);
  const [summarySlide, setSummarySlide] = useState<0 | 1>(0);
  const [slideDirection, setSlideDirection] = useState<number>(0);
  const [variantsViewMode, setVariantsViewMode] = useState<'swipe' | 'table'>('swipe');
  const [ukviSlide, setUkviSlide] = useState<0 | 1>(0);
  const [ukviDirection, setUkviDirection] = useState<number>(0);
  const [deliveryViewMode, setDeliveryViewMode] = useState<'swipe' | 'tabs'>('swipe');
  const [activeDeliveryTab, setActiveDeliveryTab] = useState<number>(0);
  const [onlineViewMode, setOnlineViewMode] = useState<'tabs' | 'all'>('tabs');
  const [onlineSlide, setOnlineSlide] = useState<number>(0);
  const [onlineDirection, setOnlineDirection] = useState<number>(0);
  const [structureViewMode, setStructureViewMode] = useState<'table' | 'swipe'>('table');
  const [skillsViewMode, setSkillsViewMode] = useState<'tabs' | 'all'>('tabs');
  const [activeSkillTab, setActiveSkillTab] = useState<number>(0);
  const [skillSlideDirection, setSkillSlideDirection] = useState<number>(0);
  const [rawConversionViewMode, setRawConversionViewMode] = useState<'all' | 'tabs'>('all');
  const [activeRawConversionTab, setActiveRawConversionTab] = useState<number>(0);
  const [bandInterpViewMode, setBandInterpViewMode] = useState<'table' | 'cards'>('table');
  const [requiredScoresViewMode, setRequiredScoresViewMode] = useState<'table' | 'cards'>('table');
  const [resultsTimingViewMode, setResultsTimingViewMode] = useState<'table' | 'cards'>('table');
  const [trfUpdateSlide, setTrfUpdateSlide] = useState<0 | 1>(0);
  const [sharingViewMode, setSharingViewMode] = useState<'tabs' | 'all'>('tabs');
  const [activeSharingTab, setActiveSharingTab] = useState<0 | 1 | 2>(0);
  const [regStepsViewMode, setRegStepsViewMode] = useState<'grid' | 'timeline'>('grid');
  const [identityViewMode, setIdentityViewMode] = useState<'tabs' | 'all'>('tabs');
  const [activeIdentityTab, setActiveIdentityTab] = useState<number>(0);
  const [cancelPolicySlide, setCancelPolicySlide] = useState<0 | 1>(0);
  const [ukviRefundViewMode, setUkviRefundViewMode] = useState<'table' | 'cards'>('table');
  const [osrDetailViewMode, setOsrDetailViewMode] = useState<'tabs' | 'all'>('tabs');
  const [activeOsrTab, setActiveOsrTab] = useState<0 | 1 | 2>(0);
  const [eorVsOsrViewMode, setEorVsOsrViewMode] = useState<'table' | 'cards'>('table');
  const [testDayViewMode, setTestDayViewMode] = useState<'tabs' | 'all'>('tabs');
  const [activeTestDayTab, setActiveTestDayTab] = useState<0 | 1 | 2>(0);
  const [accessArrViewMode, setAccessArrViewMode] = useState<'swipe' | 'table'>('swipe');
  const [prepOrgViewMode, setPrepOrgViewMode] = useState<'swipe' | 'grid'>('swipe');
  const [faqViewMode, setFaqViewMode] = useState<'swipe' | 'grid' | 'list'>('swipe');
  const [faqSearchQuery, setFaqSearchQuery] = useState<string>('');
  const [prepPlanViewMode, setPrepPlanViewMode] = useState<'grid' | 'timeline'>('grid');
  const [openFaqIndices, setOpenFaqIndices] = useState<number[]>([]);

  const toggleFaqItem = (idx: number) => {
    setOpenFaqIndices((prev) =>
      prev.includes(idx) ? prev.filter((item) => item !== idx) : [...prev, idx]
    );
  };

  const isIelts =
    exam.id?.toLowerCase().includes('ielts') ||
    exam.nameEn?.toUpperCase().includes('IELTS') ||
    exam.name?.includes('آيلتس') ||
    exam.name?.includes('أيلتس');

  const categoryTitle = isIelts
    ? 'اختبارات اللغة الإنجليزية'
    : CATEGORY_LABELS[exam.category] ?? exam.category;

  const displayTitleAr = isIelts ? 'اختبار الآيلتس' : exam.name;
  const displayTitleEn = isIelts
    ? 'International English Language Testing System'
    : exam.nameEn || exam.nameEn;

  const displayTags = isIelts
    ? ['الإنجليزية', 'اختبار دولي']
    : [exam.language || 'الإنجليزية', exam.category || 'اختبار دولي'];

  const displayDescription = isIelts
    ? GUIDE_REFERENCE_META.introParagraph
    : exam.description;

  const metrics = isIelts
    ? {
        duration: 'ساعتان و45 دقيقة تقريبًا',
        scoreRange: 'Band 1 – 9 (أو Pass/Fail)',
        validity: 'سنتان عادة',
        skillsCount: '4 مهارات (Listening, Reading, Writing, Speaking)',
        acceptingOrgs: '+12,500 مؤسسة',
        globalReach: '+140 دولة / +160 دولة (4,500+ موقع)',
        examType: 'اختبار كفاءة دولي معياري',
        languageAbbr: 'الإنجليزية — IELTS',
        resultFormat: 'Test Report Form (TRF) أو eTRF',
        verificationDate: '12 مارس 2026 / أكتوبر 2026',
      }
    : {
        duration: exam.duration || 'ساعتان و45 دقيقة',
        scoreRange: exam.scoreRange || '0 – 9',
        validity: exam.validity || 'سنتان',
        skillsCount: exam.sections?.length ? `${exam.sections.length} مهارات` : '4 مهارات',
        acceptingOrgs: exam.recognitionSummary || '+12,500 مؤسسة',
        globalReach: exam.relatedCountries?.length
          ? `+${exam.relatedCountries.length} دولة`
          : '+140 دولة',
        examType: exam.category || 'اختبار كفاءة دولي معياري',
        languageAbbr: `${exam.language || 'الإنجليزية'} — ${exam.nameEn || 'IELTS'}`,
        resultFormat: 'شهادة رسمية معترف بها دوليًا',
        verificationDate: 'أكتوبر 2026',
      };

  const measuredSkills = isIelts
    ? ['الاستماع', 'القراءة', 'الكتابة', 'المحادثة']
    : exam.sections?.length
      ? exam.sections.slice(0, 4).map((s) => s.name)
      : ['الاستماع', 'القراءة', 'الكتابة', 'المحادثة'];

  const importantNote = isIelts
    ? 'لا توجد درجة نجاح أو رسوب موحدة في IELTS؛ كل جامعة أو جهة تحدد الدرجة المطلوبة. وتختلف النسخة المناسبة حسب غرض الاختبار.'
    : exam.importantWarnings?.[0] ||
      'لا توجد درجة نجاح أو رسوب موحدة؛ كل جامعة أو جهة أكاديمية تحدد الدرجة المطلوبة حسب التخصص والبرنامج الدراسي.';

  const officialRegistrationUrl = exam.officialLinks?.[0]?.url || (isIelts ? 'https://ielts.org' : undefined);

  const handleSaveClick = () => {
    if (!onToggleFavorite) return;
    onToggleFavorite(exam.id);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleSummaryTabChange = (nextIdx: 0 | 1) => {
    setSlideDirection(nextIdx > summarySlide ? 1 : -1);
    setSummarySlide(nextIdx);
  };

  const handleSummaryDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    const threshold = 35;
    if (info.offset.x > threshold && summarySlide === 0) {
      setSlideDirection(1);
      setSummarySlide(1);
    } else if (info.offset.x < -threshold && summarySlide === 1) {
      setSlideDirection(-1);
      setSummarySlide(0);
    }
  };

  const handleUkviTabChange = (nextIdx: 0 | 1) => {
    setUkviDirection(nextIdx > ukviSlide ? 1 : -1);
    setUkviSlide(nextIdx);
  };

  const handleUkviDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    const threshold = 35;
    if (info.offset.x > threshold && ukviSlide === 0) {
      setUkviDirection(1);
      setUkviSlide(1);
    } else if (info.offset.x < -threshold && ukviSlide === 1) {
      setUkviDirection(-1);
      setUkviSlide(0);
    }
  };

  const handleOnlineTabChange = (nextIdx: number) => {
    setOnlineDirection(nextIdx > onlineSlide ? 1 : -1);
    setOnlineSlide(nextIdx);
  };

  const handleOnlineDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    const threshold = 35;
    if (info.offset.x > threshold && onlineSlide < IELTS_ONLINE_SECTIONS.length - 1) {
      setOnlineDirection(1);
      setOnlineSlide((prev) => prev + 1);
    } else if (info.offset.x < -threshold && onlineSlide > 0) {
      setOnlineDirection(-1);
      setOnlineSlide((prev) => prev - 1);
    }
  };

  const handleSkillTabChange = (nextIdx: number) => {
    setSkillSlideDirection(nextIdx > activeSkillTab ? 1 : -1);
    setActiveSkillTab(nextIdx);
  };

  const handleSkillDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    const threshold = 35;
    if (info.offset.x > threshold && activeSkillTab < SECTION7_SKILL_TABS.length - 1) {
      setSkillSlideDirection(1);
      setActiveSkillTab((prev) => prev + 1);
    } else if (info.offset.x < -threshold && activeSkillTab > 0) {
      setSkillSlideDirection(-1);
      setActiveSkillTab((prev) => prev - 1);
    }
  };

  const renderSkillModuleContent = (skillIndex: number) => {
    if (skillIndex === 0) {
      /* 1. قسم الاستماع — Listening */
      return (
        <div className="space-y-2.5 w-full">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-[var(--mn-border)] pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#142B5F]/10 border border-[#142B5F]/25 dark:bg-[#D6A43B]/15 dark:border-[#D6A43B]/40 mn-dark:bg-[#D6A43B]/15 mn-dark:border-[#D6A43B]/40 flex items-center justify-center shrink-0">
                <Headphones className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]" />
              </div>
              <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)]">
                قسم الاستماع — Listening
              </h4>
            </div>
            {skillsViewMode === 'tabs' && (
              <span className="text-[9.5px] font-bold text-[var(--mn-text-muted)] shrink-0">
                اسحب يمينًا أو يسارًا ⇄
              </span>
            )}
          </div>

          {/* ملخص الدليل الشامل للطالب */}
          <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border-brand)]/60 p-2.5 flex items-start gap-2 shadow-2xs w-full">
            <span className="w-1.5 h-4 rounded-full bg-[#142B5F] dark:bg-[#D6A43B] mn-dark:bg-[#D6A43B] shrink-0 mt-1" />
            <p className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] flex-1">
              <strong className="text-[var(--mn-heading)]">المدة والأسئلة:</strong> نحو 30 دقيقة للتسجيلات الصوتية و40 سؤالًا، مع 10 دقائق نقل في الورقي وحوالي دقيقتين مراجعة في الحاسوب. يتكون من 4 أجزاء: حوار في سياق يومي، حديث فردي في سياق يومي، نقاش بين عدة أشخاص في سياق تعليمي أو تدريبي، ومحاضرة أكاديمية قصيرة. يُشغّل التسجيل مرة واحدة فقط وتُستخدم لهجات إنجليزية متعددة، وكل إجابة صحيحة بدرجة واحدة مع أهمية الإملاء والالتزام بعدد الكلمات المطلوب.
            </p>
          </div>

          {/* المواصفات الأساسية */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 w-full">
            {LISTENING_SPECS.map((spec, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2 flex flex-col justify-between gap-0.5 shadow-2xs"
              >
                <span className="text-[10px] font-bold text-[var(--mn-text-muted)]">
                  {spec.label}:
                </span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-snug">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>

          {/* الأجزاء */}
          <div className="pt-2 border-t border-[var(--mn-border)] space-y-1.5 w-full">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 rounded-full bg-[#142B5F] dark:bg-[#D6A43B] mn-dark:bg-[#D6A43B] shrink-0" />
              <h5 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                الأجزاء
              </h5>
            </div>
            <div className="grid grid-cols-2 gap-1.5 w-full">
              {LISTENING_PARTS.map((part, idx) => {
                const isNavy = idx % 2 === 0;
                return (
                  <div
                    key={idx}
                    className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2 flex items-start gap-1.5 shadow-2xs"
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                        isNavy
                          ? 'text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]'
                          : 'text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]'
                      }`}
                    />
                    <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                      {part}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* أنواع الأسئلة */}
          <div className="pt-2 border-t border-[var(--mn-border)] space-y-1.5 w-full">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 rounded-full bg-[var(--mn-accent)] shrink-0" />
              <h5 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                أنواع الأسئلة
              </h5>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full">
              {LISTENING_QUESTION_TYPES.map((qType, idx) => {
                const isNavy = idx % 2 === 0;
                return (
                  <div
                    key={idx}
                    dir="ltr"
                    className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2 flex items-center gap-1.5 shadow-2xs"
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isNavy
                          ? 'text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]'
                          : 'text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]'
                      }`}
                    />
                    <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                      {qType}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* قواعد مهمة */}
          <div className="pt-2 border-t border-[var(--mn-border)] space-y-1.5 w-full">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 rounded-full bg-[#142B5F] dark:bg-[#D6A43B] mn-dark:bg-[#D6A43B] shrink-0" />
              <h5 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                قواعد مهمة
              </h5>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full">
              {LISTENING_RULES.map((rule, idx) => {
                const isNavy = idx % 2 === 0;
                const isLastOdd =
                  LISTENING_RULES.length % 2 === 1 && idx === LISTENING_RULES.length - 1;
                return (
                  <div
                    key={idx}
                    className={`${
                      isLastOdd ? 'sm:col-span-2' : ''
                    } rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2 flex items-start gap-1.5 shadow-2xs`}
                  >
                    <Info
                      className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                        isNavy
                          ? 'text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]'
                          : 'text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]'
                      }`}
                    />
                    <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                      {rule}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* التحويل التقريبي الرسمي */}
          <div className="pt-2 border-t border-[var(--mn-border)] space-y-1.5 w-full">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 rounded-full bg-[var(--mn-accent)] shrink-0" />
              <h5 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                التحويل التقريبي الرسمي
              </h5>
            </div>
            <div className="w-full overflow-x-auto no-scrollbar rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] shadow-2xs">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-[var(--mn-surface-muted)] border-b border-[var(--mn-border)]">
                    <th className="py-1.5 px-2.5 text-[10.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] w-1/2">
                      Band
                    </th>
                    <th className="py-1.5 px-2.5 text-[10.5px] font-bold text-[var(--mn-heading)] w-1/2">
                      متوسط الصحيح من 40
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--mn-border)]">
                  {LISTENING_CONVERSION_ROWS.map((row, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 1 ? 'bg-[var(--mn-page)]/60' : ''}
                    >
                      <td className="py-1.5 px-2.5 text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)]">
                        {row.band}
                      </td>
                      <td className="py-1.5 px-2.5 text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-accent-text)]">
                        {row.raw}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text-muted)] px-1">
              قد تختلف الحدود قليلًا بين النماذج.
            </p>
          </div>
        </div>
      );
    }

    if (skillIndex === 1) {
      /* 2. القراءة الأكاديمية — Academic Reading */
      return (
        <div className="space-y-2.5 w-full">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-[var(--mn-border)] pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#D6A43B]/12 border border-[#D6A43B]/35 flex items-center justify-center shrink-0">
                <BookOpen className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]" />
              </div>
              <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)]">
                القراءة الأكاديمية — Academic Reading
              </h4>
            </div>
            {skillsViewMode === 'tabs' && (
              <span className="text-[9.5px] font-bold text-[var(--mn-text-muted)] shrink-0">
                اسحب يمينًا أو يسارًا ⇄
              </span>
            )}
          </div>

          {/* ملخص الدليل الشامل للطالب */}
          <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border-brand)]/60 p-2.5 flex items-start gap-2 shadow-2xs w-full">
            <span className="w-1.5 h-4 rounded-full bg-[var(--mn-accent)] shrink-0 mt-1" />
            <p className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] flex-1">
              <strong className="text-[var(--mn-heading)]">المدة والأسئلة:</strong> 60 دقيقة لـ 40 سؤالًا موزعة على 3 نصوص طويلة نسبيًا مأخوذة من كتب ومجلات وصحف، ومكتوبة لجمهور غير متخصص لكنها مناسبة لمن يدخل الجامعة أو التسجيل المهني. يقيس فهم الفكرة الرئيسة والتفاصيل الدقيقة والاستنتاج وموقف الكاتب وبنية النص ومعاني الكلمات من السياق، ولا يوجد وقت إضافي لنقل الإجابات بعد انتهاء الستين دقيقة.
            </p>
          </div>

          {/* المواصفات الأساسية */}
          <div className="grid grid-cols-2 gap-1.5 w-full">
            {ACADEMIC_READING_SPECS.map((spec, idx) => (
              <div
                key={idx}
                className={`${
                  spec.fullWidth ? 'col-span-2' : 'col-span-1'
                } rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2 flex items-center justify-between gap-2 shadow-2xs`}
              >
                <span className="text-[10px] font-bold text-[var(--mn-text-muted)] shrink-0">
                  {spec.label}:
                </span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] text-end">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>

          {/* أنواع الأسئلة */}
          <div className="pt-2 border-t border-[var(--mn-border)] space-y-1.5 w-full">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 rounded-full bg-[#142B5F] dark:bg-[#D6A43B] mn-dark:bg-[#D6A43B] shrink-0" />
              <h5 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                أنواع الأسئلة
              </h5>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full">
              {ACADEMIC_READING_QUESTION_TYPES.map((qType, idx) => {
                const isNavy = idx % 2 === 0;
                return (
                  <div
                    key={idx}
                    dir="ltr"
                    className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2 flex items-center gap-1.5 shadow-2xs"
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isNavy
                          ? 'text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]'
                          : 'text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]'
                      }`}
                    />
                    <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                      {qType}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ما الذي يقاس؟ */}
          <div className="pt-2 border-t border-[var(--mn-border)] w-full">
            <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2.5 flex items-start gap-2 shadow-2xs w-full">
              <div className="w-6.5 h-6.5 rounded-full bg-[#142B5F]/10 border border-[#142B5F]/25 dark:bg-[#D6A43B]/15 dark:border-[#D6A43B]/40 mn-dark:bg-[#D6A43B]/15 mn-dark:border-[#D6A43B]/40 flex items-center justify-center shrink-0 mt-0.5">
                <Compass className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                  ما الذي يقاس؟
                </h5>
                <p className="text-[10.5px] sm:text-[11px] font-semibold text-[var(--mn-text)] leading-relaxed mt-0.5">
                  الفكرة الرئيسة والتفاصيل والاستنتاج وموقف الكاتب وبنية النص ومعنى الكلمات من السياق.
                </p>
              </div>
            </div>
          </div>

          {/* التحويل التقريبي الرسمي */}
          <div className="pt-2 border-t border-[var(--mn-border)] space-y-1.5 w-full">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 rounded-full bg-[var(--mn-accent)] shrink-0" />
              <h5 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                التحويل التقريبي الرسمي
              </h5>
            </div>
            <div className="w-full overflow-x-auto no-scrollbar rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] shadow-2xs">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-[var(--mn-surface-muted)] border-b border-[var(--mn-border)]">
                    <th className="py-1.5 px-2.5 text-[10.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] w-1/2">
                      Band
                    </th>
                    <th className="py-1.5 px-2.5 text-[10.5px] font-bold text-[var(--mn-heading)] w-1/2">
                      متوسط الصحيح من 40
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--mn-border)]">
                  {ACADEMIC_READING_CONVERSION_ROWS.map((row, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 1 ? 'bg-[var(--mn-page)]/60' : ''}
                    >
                      <td className="py-1.5 px-2.5 text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)]">
                        {row.band}
                      </td>
                      <td className="py-1.5 px-2.5 text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-accent-text)]">
                        {row.raw}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text-muted)] px-1">
              لا يوجد وقت إضافي لنقل الإجابات بعد انتهاء الستين دقيقة.
            </p>
          </div>
        </div>
      );
    }

    if (skillIndex === 2) {
      /* 3. القراءة العامة — General Training Reading */
      return (
        <div className="space-y-2.5 w-full">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-[var(--mn-border)] pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#142B5F]/10 border border-[#142B5F]/25 dark:bg-[#D6A43B]/15 dark:border-[#D6A43B]/40 mn-dark:bg-[#D6A43B]/15 mn-dark:border-[#D6A43B]/40 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]" />
              </div>
              <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)]">
                القراءة العامة — General Training Reading
              </h4>
            </div>
            {skillsViewMode === 'tabs' && (
              <span className="text-[9.5px] font-bold text-[var(--mn-text-muted)] shrink-0">
                اسحب يمينًا أو يسارًا ⇄
              </span>
            )}
          </div>

          {/* ملخص الدليل الشامل للطالب */}
          <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border-brand)]/60 p-2.5 flex items-start gap-2 shadow-2xs w-full">
            <span className="w-1.5 h-4 rounded-full bg-[#142B5F] dark:bg-[#D6A43B] mn-dark:bg-[#D6A43B] shrink-0 mt-1" />
            <p className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] flex-1">
              <strong className="text-[var(--mn-heading)]">المدة والأسئلة:</strong> 60 دقيقة لـ 40 سؤالًا موزعة على 3 أقسام متدرجة: نصوص قصيرة مرتبطة بالحياة اليومية، ونصوص مرتبطة بالعمل والتدريب والسياسات والوظائف، ونص أطول وأكثر تعقيدًا في موضوع عام. لأن نصوص <strong dir="ltr">Academic Reading</strong> قد تتضمن مفردات وبنية أعقد، يحتاج المسار العام عادة إلى عدد أكبر من الإجابات الصحيحة للوصول إلى الدرجة نفسها.
            </p>
          </div>

          {/* المواصفات الأساسية */}
          <div className="grid grid-cols-2 gap-1.5 w-full">
            {GENERAL_READING_SPECS.map((spec, idx) => (
              <div
                key={idx}
                className={`${
                  spec.fullWidth ? 'col-span-2' : 'col-span-1'
                } rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2 flex items-center justify-between gap-2 shadow-2xs`}
              >
                <span className="text-[10px] font-bold text-[var(--mn-text-muted)] shrink-0">
                  {spec.label}:
                </span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] text-end">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>

          {/* الأقسام الثلاثة */}
          <div className="pt-2 border-t border-[var(--mn-border)] space-y-1.5 w-full">
            {GENERAL_READING_SECTIONS.map((sec, idx) => {
              const isNavy = idx % 2 === 0;
              return (
                <div
                  key={idx}
                  className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2.5 flex items-start gap-2 shadow-2xs w-full"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                      isNavy
                        ? 'bg-[#142B5F]/10 border-[#142B5F]/25 dark:bg-[#D6A43B]/15 dark:border-[#D6A43B]/40 mn-dark:bg-[#D6A43B]/15 mn-dark:border-[#D6A43B]/40'
                        : 'bg-[#D6A43B]/12 border-[#D6A43B]/35'
                    }`}
                  >
                    <BookOpen
                      className={`w-3 h-3 ${
                        isNavy
                          ? 'text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]'
                          : 'text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                      {sec.title}
                    </h5>
                    <p className="text-[10.5px] font-semibold text-[var(--mn-text)] leading-relaxed mt-0.5">
                      {sec.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* أنواع الأسئلة */}
          <div className="pt-2 border-t border-[var(--mn-border)] w-full">
            <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2.5 flex items-start gap-2 shadow-2xs w-full">
              <div className="w-6.5 h-6.5 rounded-full bg-[#D6A43B]/12 border border-[#D6A43B]/35 flex items-center justify-center shrink-0 mt-0.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                  أنواع الأسئلة
                </h5>
                <p className="text-[10.5px] sm:text-[11px] font-semibold text-[var(--mn-text)] leading-relaxed mt-0.5">
                  تتشابه مع أنواع Academic Reading، لكن السياقات يومية ومهنية أكثر.
                </p>
              </div>
            </div>
          </div>

          {/* التحويل التقريبي الرسمي */}
          <div className="pt-2 border-t border-[var(--mn-border)] space-y-1.5 w-full">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 rounded-full bg-[var(--mn-accent)] shrink-0" />
              <h5 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                التحويل التقريبي الرسمي
              </h5>
            </div>
            <div className="w-full overflow-x-auto no-scrollbar rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] shadow-2xs">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-[var(--mn-surface-muted)] border-b border-[var(--mn-border)]">
                    <th className="py-1.5 px-2.5 text-[10.5px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] w-1/2">
                      Band
                    </th>
                    <th className="py-1.5 px-2.5 text-[10.5px] font-bold text-[var(--mn-heading)] w-1/2">
                      متوسط الصحيح من 40
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--mn-border)]">
                  {GENERAL_READING_CONVERSION_ROWS.map((row, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 1 ? 'bg-[var(--mn-page)]/60' : ''}
                    >
                      <td className="py-1.5 px-2.5 text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)]">
                        {row.band}
                      </td>
                      <td className="py-1.5 px-2.5 text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-accent-text)]">
                        {row.raw}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* لماذا يحتاج إجابات أكثر؟ */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-2xl p-2.5 border border-[var(--mn-accent)]/40 shadow-2xs overflow-hidden">
            <div className="flex items-start gap-2">
              <div className="w-6.5 h-6.5 rounded-full bg-[#142B5F]/10 border border-[#142B5F]/25 dark:bg-[#D6A43B]/15 dark:border-[#D6A43B]/40 mn-dark:bg-[#D6A43B]/15 mn-dark:border-[#D6A43B]/40 flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]" />
              </div>
              <div className="flex-1 min-w-0 text-start">
                <h5 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] leading-snug">
                  لماذا يحتاج إجابات أكثر؟
                </h5>
                <p className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] mt-0.5">
                  Academic Reading قد يستخدم مفردات وبنية أعقد؛ لذلك يحتاج General Training عادة عددًا أكبر من الإجابات الصحيحة للحصول على Band نفسه.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (skillIndex === 3) {
      /* 4. الكتابة الأكاديمية — Academic Writing */
      return (
        <div className="space-y-2.5 w-full">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-[var(--mn-border)] pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#D6A43B]/12 border border-[#D6A43B]/35 flex items-center justify-center shrink-0">
                <PenTool className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]" />
              </div>
              <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)]">
                الكتابة الأكاديمية — Academic Writing
              </h4>
            </div>
            {skillsViewMode === 'tabs' && (
              <span className="text-[9.5px] font-bold text-[var(--mn-text-muted)] shrink-0">
                اسحب يمينًا أو يسارًا ⇄
              </span>
            )}
          </div>

          {/* ملخص الدليل الشامل للطالب */}
          <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border-brand)]/60 p-2.5 flex items-start gap-2 shadow-2xs w-full">
            <span className="w-1.5 h-4 rounded-full bg-[var(--mn-accent)] shrink-0 mt-1" />
            <p className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] flex-1">
              <strong className="text-[var(--mn-heading)]">المدة والمهمتان:</strong> 60 دقيقة لمهمتين؛ <strong dir="ltr">Task 1</strong> (150 كلمة على الأقل، نحو 20 دقيقة) لتلخيص ومقارنة بيانات بصرية دون رأي شخصي، و<strong dir="ltr">Task 2</strong> (250 كلمة على الأقل، نحو 40 دقيقة) لكتابة مقال أكاديمي يناقش رأيًا أو حجة أو مشكلة، مع وزن أعلى لـ <strong dir="ltr">Task 2</strong> في الدرجة النهائية ووجوب الكتابة في فقرات كاملة لا نقاط منفصلة.
            </p>
          </div>

          {/* المواصفات الأساسية */}
          <div className="grid grid-cols-2 gap-1.5 w-full">
            {ACADEMIC_WRITING_SPECS.map((spec, idx) => (
              <div
                key={idx}
                className={`${
                  spec.fullWidth ? 'col-span-2' : 'col-span-1'
                } rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2 flex items-center justify-between gap-2 shadow-2xs`}
              >
                <span className="text-[10px] font-bold text-[var(--mn-text-muted)] shrink-0">
                  {spec.label}:
                </span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] text-end">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>

          {/* Task 1 & Task 2 */}
          <div className="pt-2 border-t border-[var(--mn-border)] grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
            {/* Task 1 */}
            <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2.5 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 border-b border-[var(--mn-border)] pb-1">
                <span className="w-1.5 h-3.5 rounded-full bg-[#142B5F] dark:bg-[#D6A43B] mn-dark:bg-[#D6A43B] shrink-0" />
                <h5 dir="ltr" className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                  Task 1
                </h5>
              </div>
              <div className="space-y-1">
                {ACADEMIC_WRITING_TASK1.map((item, idx) => {
                  const isNavy = idx % 2 === 0;
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-1.5 rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)]/70 p-1.5"
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          isNavy
                            ? 'text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]'
                            : 'text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]'
                        }`}
                      />
                      <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task 2 */}
            <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2.5 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 border-b border-[var(--mn-border)] pb-1">
                <span className="w-1.5 h-3.5 rounded-full bg-[var(--mn-accent)] shrink-0" />
                <h5 dir="ltr" className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                  Task 2
                </h5>
              </div>
              <div className="space-y-1">
                {ACADEMIC_WRITING_TASK2.map((item, idx) => {
                  const isNavy = idx % 2 === 1;
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-1.5 rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)]/70 p-1.5"
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          isNavy
                            ? 'text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]'
                            : 'text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]'
                        }`}
                      />
                      <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* معايير التصحيح */}
          <div className="pt-2 border-t border-[var(--mn-border)] space-y-1.5 w-full">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 rounded-full bg-[#142B5F] dark:bg-[#D6A43B] mn-dark:bg-[#D6A43B] shrink-0" />
              <h5 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                معايير التصحيح
              </h5>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full">
              {ACADEMIC_WRITING_CRITERIA.map((crit, idx) => {
                const isNavy = idx % 2 === 0;
                return (
                  <div
                    key={idx}
                    className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2 flex items-start gap-1.5 shadow-2xs"
                  >
                    <Award
                      className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                        isNavy
                          ? 'text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]'
                          : 'text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]'
                      }`}
                    />
                    <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                      {crit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* قواعد مهمة */}
          <div className="pt-2 border-t border-[var(--mn-border)] space-y-1.5 w-full">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 rounded-full bg-[var(--mn-accent)] shrink-0" />
              <h5 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                قواعد مهمة
              </h5>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full">
              {ACADEMIC_WRITING_RULES.map((rule, idx) => {
                const isNavy = idx % 2 === 0;
                return (
                  <div
                    key={idx}
                    className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2 flex items-start gap-1.5 shadow-2xs"
                  >
                    <Info
                      className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                        isNavy
                          ? 'text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]'
                          : 'text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]'
                      }`}
                    />
                    <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                      {rule}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (skillIndex === 4) {
      /* 5. الكتابة العامة — General Training Writing */
      return (
        <div className="space-y-2.5 w-full">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-[var(--mn-border)] pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#142B5F]/10 border border-[#142B5F]/25 dark:bg-[#D6A43B]/15 dark:border-[#D6A43B]/40 mn-dark:bg-[#D6A43B]/15 mn-dark:border-[#D6A43B]/40 flex items-center justify-center shrink-0">
                <Layers className="w-3.5 h-3.5 text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]" />
              </div>
              <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)]">
                الكتابة العامة — General Training Writing
              </h4>
            </div>
            {skillsViewMode === 'tabs' && (
              <span className="text-[9.5px] font-bold text-[var(--mn-text-muted)] shrink-0">
                اسحب يمينًا أو يسارًا ⇄
              </span>
            )}
          </div>

          {/* ملخص الدليل الشامل للطالب */}
          <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border-brand)]/60 p-2.5 flex items-start gap-2 shadow-2xs w-full">
            <span className="w-1.5 h-4 rounded-full bg-[#142B5F] dark:bg-[#D6A43B] mn-dark:bg-[#D6A43B] shrink-0 mt-1" />
            <p className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] flex-1">
              <strong className="text-[var(--mn-heading)]">المدة والمهمتان:</strong> 60 دقيقة لمهمتين؛ <strong dir="ltr">Task 1 — Letter</strong> (150 كلمة على الأقل) لكتابة رسالة رسمية أو شبه رسمية أو شخصية لطلب معلومات أو شرح موقف مع تغطية جميع النقاط المطلوبة، و<strong dir="ltr">Task 2 — Essay</strong> (250 كلمة على الأقل) لمقال حول وجهة نظر أو حجة أو مشكلة في موضوع عام وبأسلوب قد يكون أكثر شخصية قليلًا من الأكاديمي.
            </p>
          </div>

          {/* المواصفات الأساسية */}
          <div className="grid grid-cols-2 gap-1.5 w-full">
            {GENERAL_WRITING_SPECS.map((spec, idx) => (
              <div
                key={idx}
                className={`${
                  spec.fullWidth ? 'col-span-2' : 'col-span-1'
                } rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2 flex items-center justify-between gap-2 shadow-2xs`}
              >
                <span className="text-[10px] font-bold text-[var(--mn-text-muted)] shrink-0">
                  {spec.label}:
                </span>
                <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] text-end">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>

          {/* Task 1 — Letter & Task 2 — Essay */}
          <div className="pt-2 border-t border-[var(--mn-border)] grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
            {/* Task 1 — Letter */}
            <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2.5 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 border-b border-[var(--mn-border)] pb-1">
                <span className="w-1.5 h-3.5 rounded-full bg-[#142B5F] dark:bg-[#D6A43B] mn-dark:bg-[#D6A43B] shrink-0" />
                <h5 dir="ltr" className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                  Task 1 — Letter
                </h5>
              </div>
              <div className="space-y-1">
                {GENERAL_WRITING_TASK1.map((item, idx) => {
                  const isNavy = idx % 2 === 0;
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-1.5 rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)]/70 p-1.5"
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          isNavy
                            ? 'text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]'
                            : 'text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]'
                        }`}
                      />
                      <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task 2 — Essay */}
            <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2.5 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 border-b border-[var(--mn-border)] pb-1">
                <span className="w-1.5 h-3.5 rounded-full bg-[var(--mn-accent)] shrink-0" />
                <h5 dir="ltr" className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                  Task 2 — Essay
                </h5>
              </div>
              <div className="space-y-1">
                {GENERAL_WRITING_TASK2.map((item, idx) => {
                  const isNavy = idx % 2 === 1;
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-1.5 rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)]/70 p-1.5"
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          isNavy
                            ? 'text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]'
                            : 'text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]'
                        }`}
                      />
                      <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* معايير التصحيح */}
          <div className="pt-2 border-t border-[var(--mn-border)] space-y-1.5 w-full">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 rounded-full bg-[#142B5F] dark:bg-[#D6A43B] mn-dark:bg-[#D6A43B] shrink-0" />
              <h5 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                معايير التصحيح
              </h5>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full">
              {GENERAL_WRITING_CRITERIA.map((crit, idx) => {
                const isNavy = idx % 2 === 0;
                return (
                  <div
                    key={idx}
                    dir="ltr"
                    className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2 flex items-center gap-1.5 shadow-2xs"
                  >
                    <Award
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isNavy
                          ? 'text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]'
                          : 'text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]'
                      }`}
                    />
                    <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                      {crit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* الفرق عن Academic */}
          <div className="relative w-full bg-[var(--mn-surface)] rounded-2xl p-2.5 border border-[var(--mn-accent)]/40 shadow-2xs overflow-hidden">
            <div className="flex items-start gap-2">
              <div className="w-6.5 h-6.5 rounded-full bg-[#D6A43B]/12 border border-[#D6A43B]/35 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]" />
              </div>
              <div className="flex-1 min-w-0 text-start">
                <h5 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)] leading-snug">
                  الفرق عن Academic
                </h5>
                <p className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] mt-0.5">
                  Task 1 رسالة بدل وصف بيانات، وTask 2 أقرب للموضوعات العامة، لكن الدرجة ليست أسهل تلقائيًا.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    /* 6. المحادثة — Speaking */
    return (
      <div className="space-y-2.5 w-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-[var(--mn-border)] pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#D6A43B]/12 border border-[#D6A43B]/35 flex items-center justify-center shrink-0">
              <Mic className="w-3.5 h-3.5 text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]" />
            </div>
            <h4 className="text-[12px] sm:text-[12.5px] font-bold text-[var(--mn-heading)]">
              المحادثة — Speaking
            </h4>
          </div>
          {skillsViewMode === 'tabs' && (
            <span className="text-[9.5px] font-bold text-[var(--mn-text-muted)] shrink-0">
              اسحب يمينًا أو يسارًا ⇄
            </span>
          )}
        </div>

        {/* ملخص الدليل الشامل للطالب */}
        <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border-brand)]/60 p-2.5 flex items-start gap-2 shadow-2xs w-full">
          <span className="w-1.5 h-4 rounded-full bg-[var(--mn-accent)] shrink-0 mt-1" />
          <p className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] flex-1">
            <strong className="text-[var(--mn-heading)]">المدة والأجزاء:</strong> 11 إلى 14 دقيقة وهي نفسها في <strong dir="ltr">Academic</strong> و<strong dir="ltr">General Training</strong>، وتُجرى مع ممتحن بشري معتمد وتُسجّل صوتيًا. تتكون من 3 أجزاء: <strong dir="ltr">Part 1</strong> (4–5 دقائق لأسئلة عامة مألوفة)، و<strong dir="ltr">Part 2</strong> (دقيقة تحضير مع بطاقة موضوع <strong dir="ltr">Task Card</strong> ثم حديث فردي لمدة 1–2 دقيقة)، و<strong dir="ltr">Part 3</strong> (4–5 دقائق لنقاش أعمق وأفكار مجردة)، ولا توجد لهجة مطلوبة بعينها بل وضوح النطق والتواصل.
          </p>
        </div>

        {/* المواصفات الأساسية */}
        <div className="grid grid-cols-2 gap-1.5 w-full">
          {SPEAKING_SPECS.map((spec, idx) => (
            <div
              key={idx}
              className={`${
                spec.fullWidth ? 'col-span-2' : 'col-span-1'
              } rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2 flex items-center justify-between gap-2 shadow-2xs`}
            >
              <span className="text-[10px] font-bold text-[var(--mn-text-muted)] shrink-0">
                {spec.label}:
              </span>
              <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] text-end">
                {spec.value}
              </span>
            </div>
          ))}
        </div>

        {/* Part 1, Part 2, Part 3 */}
        <div className="pt-2 border-t border-[var(--mn-border)] space-y-2 w-full">
          {/* Part 1 */}
          <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2.5 flex items-start gap-2 shadow-2xs w-full">
            <div className="w-6 h-6 rounded-full bg-[#142B5F]/10 border border-[#142B5F]/25 dark:bg-[#D6A43B]/15 dark:border-[#D6A43B]/40 mn-dark:bg-[#D6A43B]/15 mn-dark:border-[#D6A43B]/40 flex items-center justify-center shrink-0 mt-0.5">
              <Mic className="w-3 h-3 text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]" />
            </div>
            <div className="flex-1 min-w-0">
              <h5 dir="ltr" className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] text-end">
                Part 1
              </h5>
              <p className="text-[10.5px] font-semibold text-[var(--mn-text)] leading-relaxed mt-0.5">
                4–5 دقائق من الأسئلة عن المنزل والأسرة والدراسة والعمل والهوايات والموضوعات المألوفة.
              </p>
            </div>
          </div>

          {/* Part 2 */}
          <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2.5 space-y-1.5 shadow-2xs w-full">
            <div className="flex items-center gap-1.5 border-b border-[var(--mn-border)] pb-1">
              <span className="w-1.5 h-3.5 rounded-full bg-[var(--mn-accent)] shrink-0" />
              <h5 dir="ltr" className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
                Part 2
              </h5>
            </div>
            <div className="grid grid-cols-2 gap-1.5 w-full">
              {SPEAKING_PART2_BULLETS.map((bullet, idx) => {
                const isNavy = idx % 2 === 0;
                return (
                  <div
                    key={idx}
                    className="rounded-lg bg-[var(--mn-page)] border border-[var(--mn-border)]/70 p-1.5 flex items-start gap-1.5"
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                        isNavy
                          ? 'text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]'
                          : 'text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]'
                      }`}
                    />
                    <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                      {bullet}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Part 3 */}
          <div className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2.5 flex items-start gap-2 shadow-2xs w-full">
            <div className="w-6 h-6 rounded-full bg-[#D6A43B]/12 border border-[#D6A43B]/35 flex items-center justify-center shrink-0 mt-0.5">
              <Mic className="w-3 h-3 text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]" />
            </div>
            <div className="flex-1 min-w-0">
              <h5 dir="ltr" className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] text-end">
                Part 3
              </h5>
              <p className="text-[10.5px] font-semibold text-[var(--mn-text)] leading-relaxed mt-0.5">
                4–5 دقائق من النقاش الأعمق والمجرد المرتبط بموضوع Part 2.
              </p>
            </div>
          </div>
        </div>

        {/* معايير التصحيح */}
        <div className="pt-2 border-t border-[var(--mn-border)] space-y-1.5 w-full">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 rounded-full bg-[#142B5F] dark:bg-[#D6A43B] mn-dark:bg-[#D6A43B] shrink-0" />
            <h5 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
              معايير التصحيح
            </h5>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full">
            {SPEAKING_CRITERIA.map((crit, idx) => {
              const isNavy = idx % 2 === 0;
              return (
                <div
                  key={idx}
                  dir="ltr"
                  className="rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2 flex items-center gap-1.5 shadow-2xs"
                >
                  <Award
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isNavy
                        ? 'text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]'
                        : 'text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]'
                    }`}
                  />
                  <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                    {crit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* قواعد */}
        <div className="pt-2 border-t border-[var(--mn-border)] space-y-1.5 w-full">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 rounded-full bg-[var(--mn-accent)] shrink-0" />
            <h5 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)]">
              قواعد
            </h5>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full">
            {SPEAKING_RULES.map((rule, idx) => {
              const isNavy = idx % 2 === 0;
              const isLastOdd =
                SPEAKING_RULES.length % 2 === 1 && idx === SPEAKING_RULES.length - 1;
              return (
                <div
                  key={idx}
                  className={`${
                    isLastOdd ? 'sm:col-span-2' : ''
                  } rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] p-2 flex items-start gap-1.5 shadow-2xs`}
                >
                  <Info
                    className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                      isNavy
                        ? 'text-[#142B5F] dark:text-[#D6A43B] mn-dark:text-[#D6A43B]'
                        : 'text-[#D6A43B] dark:text-[#F2CD78] mn-dark:text-[#F2CD78]'
                    }`}
                  />
                  <span className="text-[10.5px] font-bold text-[var(--mn-heading)] leading-snug">
                    {rule}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="w-full max-w-md md:max-w-[1120px] lg:max-w-[1160px] mx-auto pt-0 pb-14 text-start font-['Cairo',sans-serif] animate-in fade-in duration-200 bg-[var(--mn-page)] min-h-screen select-none relative"
      dir={publicDir}
    >
      {/* ========================================================================= */}
      {/* 1. TOP HERO SECTION (نيلي مع بترولي فيروزي نفس بقية الأقسام)               */}
      {/* ========================================================================= */}
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-[#142B5F] via-[#153B75] to-[#0E7C86] text-white px-3.5 sm:px-4 md:px-8 py-4 md:py-6 border-b-2 border-[#D6A43B] shadow-md mn-inverse">
        {/* Decorative Subtle Gold Waves */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <svg
            viewBox="0 0 500 140"
            preserveAspectRatio="none"
            className="w-full h-full absolute inset-0 block"
          >
            <g opacity="0.2">
              <path
                d="M -50,30 Q 120,-10 260,35 T 550,20"
                stroke="#F2CD78"
                strokeWidth="1.3"
                fill="none"
              />
              <path
                d="M -30,70 Q 150,25 320,60 T 560,40"
                stroke="#D6A43B"
                strokeWidth="1"
                fill="none"
              />
              <circle cx="42" cy="22" r="1.5" fill="#F2CD78" />
              <circle cx="445" cy="26" r="1.5" fill="#F2CD78" />
            </g>
          </svg>
        </div>

        {/* Hero Row: Right (Logo + Title + Subtitle) | Left (Stacked Back + Favorite Buttons) */}
        <div className="relative z-10 flex items-center justify-between gap-3 md:gap-5">
          {/* Right Side: IELTS Logo Box + Titles */}
          <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
            {/* Logo Box */}
            <div className="w-14 h-14 sm:w-15 sm:h-15 md:w-18 md:h-18 rounded-2xl p-[2px] bg-gradient-to-br from-[#FFEAA7] via-[#D6A43B] to-[#9E731F] shadow-[0_2px_12px_rgba(0,0,0,0.22)] shrink-0">
              <div className="w-full h-full rounded-[14px] bg-white p-1.5 flex items-center justify-center overflow-hidden">
                <ExamVectorLogo
                  name={exam.nameEn || exam.name}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Titles */}
            <div className="flex flex-col text-start min-w-0 flex-1">
              <h1 className="text-[16px] sm:text-[17.5px] md:text-2xl lg:text-[26px] font-extrabold text-white leading-snug drop-shadow-xs">
                {displayTitleAr}
              </h1>
              <p
                dir="ltr"
                className="text-[10px] sm:text-[10.5px] md:text-sm font-semibold text-white/90 font-['Cairo',sans-serif] tracking-wide text-end sm:text-start leading-tight mt-0.5 truncate"
              >
                {displayTitleEn}
              </p>
            </div>
          </div>

          {/* Left Side: Vertically Stacked Back & Favorite Buttons */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="رجوع"
              title="رجوع"
              className="w-9 h-9 md:w-10 md:h-10 rounded-xl border border-[#D6A43B]/80 bg-[#142B5F]/45 hover:bg-[#142B5F]/75 text-[#F2CD78] flex items-center justify-center shadow-xs backdrop-blur-xs transition-all active:scale-95 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-[#F2CD78]" />
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleSaveClick();
              }}
              aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
              title={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
              className="w-9 h-9 md:w-10 md:h-10 rounded-xl border border-[#D6A43B]/80 bg-[#142B5F]/45 hover:bg-[#142B5F]/75 text-[#F2CD78] flex items-center justify-center shadow-xs backdrop-blur-xs transition-all active:scale-95 cursor-pointer"
            >
              <Heart
                className={`w-4 h-4 md:w-5 md:h-5 transition-transform ${
                  isFavorite ? 'fill-[#F2CD78] text-[#F2CD78]' : 'text-[#F2CD78]'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OFFICIAL REGISTRATION BUTTON BAR (التسجيل الرسمي)                         */}
      {/* ========================================================================= */}
      <div
        className="w-full bg-[var(--mn-surface)] px-3 sm:px-3.5 md:px-6 py-2.5 md:py-3.5 border-b border-[var(--mn-border-brand)] mn-panel"
        dir={publicDir}
      >
        <a
          href={officialRegistrationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full md:max-w-md md:mx-auto py-2.5 md:py-3 px-4 rounded-2xl bg-gradient-to-r from-[#142B5F] via-[#153B75] to-[#0E7C86] hover:opacity-95 text-white border border-[#D6A43B] shadow-sm flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer mn-inverse"
        >
          <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#F2CD78] shrink-0" />
          <span className="text-[12px] sm:text-[12.5px] md:text-sm font-extrabold leading-none text-white">
            التسجيل الرسمي
          </span>
        </a>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: 1. نظرة عامة على الاختبار                                       */}
      {/* ========================================================================= */}
      <div
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl md:mt-4 px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-b md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mn-panel font-['Cairo',sans-serif]"
        dir={publicDir}
      >
        <DetailSectionHeader
          id="exam-general-overview"
          icon={BookOpen}
          className="mb-3"
          title="1. نظرة عامة على الاختبار"
        />

        <div className="space-y-3 text-start w-full">
          {/* ما هو اختبار IELTS؟ — متوازن على نفس خط معلومات سريعة */}
          <div className="space-y-2 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <HelpCircle className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                ما هو اختبار IELTS؟
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
              <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
                الآيلتس اختبار دولي لقياس الكفاءة في اللغة الإنجليزية في المواقف الأكاديمية والاجتماعية والمهنية. يُقيّم أربع مهارات هي الاستماع (Listening)، والقراءة (Reading)، والكتابة (Writing)، والمحادثة (Speaking). وتصدر للمتقدم في الاختبار الكامل درجة منفصلة لكل مهارة ودرجة إجمالية تسمى Overall Band Score.
              </p>
            </div>
          </div>

          {/* معلومات سريعة */}
          <div className="space-y-2 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Info className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                معلومات سريعة
              </h3>
            </div>

            {/* جدول معلومات سريعة بمرجع قسم التخصصات (بكالوريوس طب وجراحة) */}
            <div className="-mx-2 sm:-mx-2.5 border-y border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden font-['Cairo',sans-serif]">
              <div className="grid grid-cols-12 bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)] items-center">
                <div className="col-span-4 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-white text-start border-l border-white/15">
                  العنصر
                </div>
                <div className="col-span-8 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-white text-start">
                  التفاصيل
                </div>
              </div>

              <div className="divide-y divide-[var(--mn-border)]">
                {SECTION1_QUICK_INFO_ROWS.map((row) => (
                  <div
                    key={row.item}
                    className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors"
                  >
                    <div className="col-span-4 py-2.5 px-3 sm:px-4 text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center">
                      {row.item}
                    </div>
                    <div className="col-span-8 py-2.5 px-3 sm:px-4 text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-relaxed flex items-center">
                      {row.details}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* يتشارك في إدارة IELTS كل من... — نقطة نيلية */}
            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
              <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
                <span className="inline-block w-2 h-2 rounded-full bg-[#142B5F] dark:bg-[#F2CD78] ml-2 align-middle shrink-0" />
                يتشارك في إدارة IELTS كل من British Council وIDP IELTS وCambridge University Press &amp; Assessment. والموقع الرسمي للاختبار هو{' '}
                <a
                  href="https://ielts.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0E7C86] dark:text-[#38C6D4] underline font-extrabold"
                >
                  IELTS.org
                </a>
                .
              </p>
            </div>

            {/* هل يوجد نجاح أو رسوب؟ */}
            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
              <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />

              <div className="flex items-center gap-2 mb-1.5">
                <span className="relative w-4 h-4 border-t-[2.5px] border-r-[2.5px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] flex items-center justify-center shrink-0">
                  <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                </span>
                <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                  هل يوجد نجاح أو رسوب؟
                </h3>
              </div>

              <p className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
                لا توجد درجة نجاح عامة موحدة في IELTS Academic وGeneral Training؛ فالجامعة أو جهة العمل أو الهجرة تحدد الدرجة والنوع المطلوبين. أما IELTS Life Skills فيستخدم نظام Pass/Fail، كما سيأتي في قسم الأنواع.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: 2. استخدامات اختبار IELTS ومميزاته                             */}
      {/* ========================================================================= */}
      <div
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mt-4 sm:mt-5 mn-panel font-['Cairo',sans-serif]"
        dir={publicDir}
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

        <DetailSectionHeader
          id="exam-overview-uses"
          icon={Compass}
          className="mb-3"
          title="2. استخدامات اختبار IELTS ومميزاته"
        />

        <div className="space-y-3 text-start w-full">
          {/* لماذا قد تحتاج إلى اختبار IELTS؟ */}
          <div className="space-y-2 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Target className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                لماذا قد تحتاج إلى اختبار IELTS؟
              </h3>
            </div>

            <div className="grid grid-rows-2 grid-flow-col auto-cols-[84%] sm:auto-cols-[260px] md:grid-rows-none md:grid-flow-row md:grid-cols-2 lg:grid-cols-3 md:auto-cols-auto gap-2 md:gap-3 overflow-x-auto md:overflow-visible pb-3 md:pb-0 mn-gold-scroll snap-x snap-mandatory items-stretch w-full">
              {[
                {
                  title: 'القبول الجامعي',
                  description:
                    'لإثبات القدرة على الدراسة بالإنجليزية في برامج البكالوريوس والماجستير والدكتوراه والبرامج التحضيرية.',
                },
                {
                  title: 'المنح الدراسية',
                  description: 'قد تطلب منحة أو جامعة مستضيفة درجة إجمالية وحدًا أدنى في كل مهارة.',
                },
                {
                  title: 'الهجرة',
                  description:
                    'تقبل بعض برامج الهجرة في دول مثل المملكة المتحدة وأستراليا وكندا ونيوزيلندا أنواعًا معينة من IELTS وفق شروط كل مسار.',
                },
                {
                  title: 'العمل',
                  description: 'قد يطلب صاحب العمل إثبات الكفاءة في التواصل المهني باللغة الإنجليزية.',
                },
                {
                  title: 'التسجيل المهني',
                  description:
                    'قد تستخدمه هيئات الترخيص في الطب والتمريض والصيدلة والهندسة والتعليم وغيرها، وقد تشترط درجات محددة لكل مهارة.',
                },
                {
                  title: 'برامج اللغة والقبول المشروط',
                  description:
                    'قد تستخدمه مؤسسات تعليمية لتحديد الحاجة إلى برنامج لغة أو مسار تمهيدي.',
                },
                {
                  title: 'بعض التأشيرات البريطانية',
                  description:
                    'تتطلب مسارات معينة اختبارًا من فئة IELTS for UKVI أو Life Skills عندما يكون الاختبار الآمن المعتمد (SELT) مطلوبًا.',
                },
              ].map((useItem, idx) => (
                <div
                  key={idx}
                  className="snap-start relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 md:p-4 pr-4 overflow-hidden flex flex-col justify-center h-full shadow-2xs"
                >
                  <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />

                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 shrink-0" aria-hidden="true">
                      <span className="w-4 h-[3px] rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4]" />
                    </span>
                    <h4 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug truncate">
                      {useItem.title}
                    </h4>
                  </div>

                  <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                    {useItem.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ما الذي يميز IELTS؟ */}
          <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
            <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />

            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative w-4 h-4 border-t-[2.5px] border-r-[2.5px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                ما الذي يميز IELTS؟
              </h3>
            </div>

            <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
              يمتاز الاختبار باعتراف واسع، وبأن المحادثة تُجرى مع ممتحن بشري معتمد، وبوجود نسخ تخدم أغراضًا أكاديمية وعامة ومتطلبات تأشيرات معينة. تصدر نتائج الكمبيوتر عادة خلال فترة قصيرة، وتتيح مراكز مؤهلة خدمة One Skill Retake لإعادة مهارة واحدة. يمكن أيضًا التحقق من تقارير النتائج رسميًا، وتتوفر ترتيبات مساندة معتمدة للحالات المؤهلة من ذوي الإعاقة أو الظروف الطبية.
            </p>
          </div>

          {/* هل يناسبك؟ */}
          <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
            <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />

            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative w-4 h-4 border-t-[2.5px] border-r-[2.5px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                هل يناسبك؟
              </h3>
            </div>

            <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
              قد يناسبك IELTS إذا كانت جامعتك أو منحتك أو الهيئة التي تتقدم إليها تقبله، وتحتاج تقريرًا لدرجة كل مهارة، أو تفضل مقابلة Speaking مع ممتحن. لا تختَر الاختبار اعتمادًا على شهرته فقط: تحقق أولًا من النسخة المطلوبة، والدرجات، وطريقة التقديم المقبولة، وحداثة النتيجة.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: 3. أنواع اختبار IELTS وكيف تختار النوع المناسب                  */}
      {/* ========================================================================= */}
      <div
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mt-4 sm:mt-5 mn-panel font-['Cairo',sans-serif]"
        dir={publicDir}
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

        <DetailSectionHeader
          id="exam-types-selection"
          icon={Layers}
          className="mb-3"
          title="3. أنواع اختبار IELTS وكيف تختار النوع المناسب"
        />

        <div className="space-y-3.5 text-start w-full">
          {/* الأنواع الأربعة */}
          <div className="space-y-2 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                أنواع اختبار IELTS
              </h3>
            </div>

            <div className="flex items-stretch gap-2 overflow-x-auto pb-3 mn-gold-scroll snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-3 md:overflow-visible md:pb-0 w-full">
              {MAIN_FOUR_EXAM_TYPES.map((typeItem, idx) => (
                <div
                  key={typeItem.id}
                  className="snap-start shrink-0 w-[82%] sm:w-[265px] md:w-full h-full relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 md:p-4 pr-4 overflow-hidden flex flex-col shadow-2xs"
                >
                  <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />

                  <div className="flex items-center gap-2 mb-1.5 shrink-0">
                    <span className="inline-flex items-center gap-1 shrink-0" aria-hidden="true">
                      <span className="w-4 h-[3px] rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4]" />
                    </span>
                    <h4 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug truncate">
                      {typeItem.title}
                    </h4>
                  </div>

                  <div className="flex-1 max-h-[145px] md:max-h-none overflow-y-auto md:overflow-visible no-scrollbar">
                    {idx === 3 ? (
                      <div className="space-y-1.5">
                        <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                          يقيس الاستماع والمحادثة فقط، وتكون النتيجة Pass أو Fail بدل Band من 0 إلى 9. يُستخدم في مسارات بريطانية تشترط إثبات القدرة على التواصل الشفهي بمستوى محدد:
                        </p>
                        {typeItem.levelsList && (
                          <div className="space-y-1 pt-1 border-t border-[var(--mn-border)]/70">
                            {typeItem.levelsList.map((lvl) => (
                              <p
                                key={lvl.code}
                                className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-snug"
                              >
                                <strong className="text-[var(--mn-heading)] ml-1">{lvl.code}:</strong>
                                {lvl.desc}
                              </p>
                            ))}
                          </div>
                        )}
                        <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify pt-1 border-t border-[var(--mn-border)]/70">
                          تستغرق الجلسة نحو 20 دقيقة في العادة، وتُجرى مع ممتحن، وغالبًا بمشاركة متقدم آخر، وتتضمن طلب معلومات وتقديم آراء وتفضيلات ومناقشة مواقف يومية. Life Skills ليس بديلًا عن Academic للقبول الجامعي لأنه لا يقيس القراءة والكتابة.
                        </p>
                      </div>
                    ) : (
                      <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        {typeItem.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* كيف تختار النسخة الصحيحة؟ */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Compass className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                كيف تختار النسخة الصحيحة؟
              </h3>
            </div>

            {/* جدول الاختيار بمرجع قسم التخصصات بدون أي نصوص ذهبية */}
            <div className="-mx-2 sm:-mx-2.5 border-y border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden font-['Cairo',sans-serif]">
              <div className="grid grid-cols-12 bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)] items-center">
                <div className="col-span-4 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-white text-start border-l border-white/15">
                  الهدف
                </div>
                <div className="col-span-4 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-white text-start border-l border-white/15">
                  النسخة المرجحة
                </div>
                <div className="col-span-4 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-white text-start">
                  التحقق الضروري
                </div>
              </div>

              <div className="divide-y divide-[var(--mn-border)]">
                {[
                  {
                    goal: 'بكالوريوس أو ماجستير أو دكتوراه',
                    likelyVersion: 'Academic',
                    verify: 'درجات البرنامج وسياسة قبول النتائج',
                  },
                  {
                    goal: 'منحة أكاديمية',
                    likelyVersion: 'Academic غالبًا',
                    verify: 'شروط المنحة والجامعة',
                  },
                  {
                    goal: 'تسجيل مهني',
                    likelyVersion: 'Academic غالبًا',
                    verify: 'الهيئة ومعدلات كل مهارة',
                  },
                  {
                    goal: 'هجرة',
                    likelyVersion: 'Academic أو General بحسب المسار',
                    verify: 'الجهة الحكومية ونوع التأشيرة',
                  },
                  {
                    goal: 'مسار بريطاني يتطلب SELT بأربع مهارات',
                    likelyVersion: 'IELTS for UKVI',
                    verify: 'نوع الاختبار والمستوى والمركز المعتمد',
                  },
                  {
                    goal: 'مسار بريطاني يتطلب السماع والتحدث فقط',
                    likelyVersion: 'Life Skills',
                    verify: 'المستوى A1 أو A2 أو B1',
                  },
                  {
                    goal: 'عمل أو تدريب عام',
                    likelyVersion: 'General Training أو نوع آخر',
                    verify: 'شروط الجهة المستقبلة',
                  },
                ].map((row) => (
                  <div
                    key={row.goal}
                    className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors"
                  >
                    <div className="col-span-4 py-2.5 px-3 sm:px-4 text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center leading-snug">
                      {row.goal}
                    </div>
                    <div className="col-span-4 py-2.5 px-3 sm:px-4 text-[10.5px] sm:text-[11px] font-bold text-[#0E7C86] dark:text-[#38C6D4] border-l border-[var(--mn-border)] flex items-center leading-snug">
                      {row.likelyVersion}
                    </div>
                    <div className="col-span-4 py-2.5 px-3 sm:px-4 text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] flex items-center leading-snug">
                      {row.verify}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* انتبه إلى الفرق بين النوع والطريقة — جوهرة نيلي فقط */}
            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
              <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />

              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
                <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                <strong className="text-[var(--mn-heading)]">انتبه إلى الفرق بين النوع والطريقة:</strong> IELTS Online Academic طريقة لتقديم النسخة الأكاديمية من المنزل في دول مدعومة، وليس مهارة أو شهادة جديدة؛ وWriting on Paper خيار لأداء الكتابة بالقلم ضمن اختبار الكمبيوتر. أما One Skill Retake فهي خدمة إعادة مهارة بعد اختبار أصلي مؤهل، وليست نوعًا أساسيًا من الاختبار.
              </p>
            </div>

            {/* من الأخطاء الشائعة — جوهرة نيلي فقط */}
            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
              <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />

              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
                <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                <strong className="text-[var(--mn-heading)]">من الأخطاء الشائعة:</strong> حجز General بدل Academic، أو حجز IELTS عادي لمسار يتطلب UKVI، أو افتراض قبول IELTS Online أو One Skill Retake من دون سؤال الجهة المستقبلة.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: 4. الاعتراف الدولي ومتطلبات القبول                              */}
      {/* ========================================================================= */}
      <div
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mt-4 sm:mt-5 mn-panel font-['Cairo',sans-serif]"
        dir={publicDir}
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

        <DetailSectionHeader
          id="exam-targets-recognition"
          icon={Globe}
          className="mb-3"
          title="4. الاعتراف الدولي ومتطلبات القبول"
        />

        <div className="space-y-3 text-start w-full">
          {/* 1. أين يُعترف باختبار IELTS؟ — متوازن على نفس خط العناوين الفرعية */}
          <div className="space-y-2 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Globe className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                أين يُعترف باختبار IELTS؟
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
              <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
                تستخدم نتيجة IELTS مؤسسات تعليمية ومهنية وجهات أخرى في المملكة المتحدة والولايات المتحدة وكندا وأستراليا ونيوزيلندا وأوروبا وآسيا والشرق الأوسط. وذكر ملف منارتك المرجعي اعتراف أكثر من{' '}
                <strong className="text-[var(--mn-heading)]">12,500 مؤسسة</strong>{' '}
                وانتشار الاختبار في أكثر من{' '}
                <strong className="text-[var(--mn-heading)]">140 دولة</strong>{' '}
                وقت توثيقه؛ أما دليل المراكز الرسمي الذي راجعناه في أكتوبر 2026 فيشير إلى أكثر من{' '}
                <strong className="text-[var(--mn-heading)]">4,500 موقع اختبار في أكثر من 160 دولة</strong>. تتغير هذه الأرقام بمرور الوقت ولا تعني قبول جميع أنواع الاختبار لدى كل مؤسسة.
              </p>
            </div>
          </div>

          {/* 2. ما الدرجات المطلوبة للدراسة والمنح؟ */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <GraduationCap className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                ما الدرجات المطلوبة للدراسة والمنح؟
              </h3>
            </div>

            <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify px-0.5">
              تختلف متطلبات IELTS من جامعة إلى أخرى، بل قد تختلف بين برنامجين في الجامعة نفسها. وتستخدم النطاقات التالية كأمثلة إرشادية غير ملزمة:
            </p>

            {/* جدول النطاقات التقريبية بمرجع قسم التخصصات بدون أي شارات ذهبية */}
            <div className="-mx-2 sm:-mx-2.5 border-y border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden font-['Cairo',sans-serif]">
              <div className="grid grid-cols-12 bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)] items-center">
                <div className="col-span-6 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-white text-start border-l border-white/15">
                  الغرض
                </div>
                <div className="col-span-6 py-2.5 px-3 sm:px-4 text-[11px] sm:text-[11.5px] font-bold text-white text-start">
                  نطاق تقريبي وارد في الملف
                </div>
              </div>

              <div className="divide-y divide-[var(--mn-border)]">
                {[
                  { pathway: 'برنامج تأسيسي أو تحضيري', commonRange: '4.5–5.5' },
                  { pathway: 'بكالوريوس', commonRange: '6.0–6.5' },
                  { pathway: 'ماجستير', commonRange: '6.5–7.0' },
                  { pathway: 'دكتوراه', commonRange: '7.0 أو أعلى في برامج كثيرة' },
                  {
                    pathway: 'طب وتمريض وبعض الهيئات المهنية',
                    commonRange: 'حدود مستقلة أكثر صرامة بحسب الهيئة',
                  },
                ].map((row) => (
                  <div
                    key={row.pathway}
                    className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors"
                  >
                    <div className="col-span-6 py-2.5 px-3 sm:px-4 text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center leading-snug">
                      {row.pathway}
                    </div>
                    <div className="col-span-6 py-2.5 px-3 sm:px-4 text-[10.5px] sm:text-[11px] font-bold text-[#0E7C86] dark:text-[#38C6D4] flex items-center leading-snug">
                      {row.commonRange}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ملاحظة شرط الدرجة الإجمالية وحد كل مهارة — نقطة بترولي */}
            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
              <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />

              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
                <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-2 shrink-0" />
                قد تشترط جهة{' '}
                <strong className="text-[var(--mn-heading)]">Overall 6.5 مع 6.0 في كل مهارة</strong>، بينما تشترط أخرى{' '}
                <strong className="text-[var(--mn-heading)]">Overall 7.0 مع Writing 6.5</strong>. لا يكفي أن تحقق المتوسط إذا كانت إحدى المهارات دون الحد المطلوب. وفي المنح، راجع شروط المنحة والجامعة المستضيفة معًا.
              </p>
            </div>
          </div>

          {/* 3. IELTS للهجرة والتأشيرات البريطانية */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                IELTS للهجرة والتأشيرات البريطانية
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 overflow-hidden shadow-2xs w-full space-y-2">
              <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
                <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-2 shrink-0" />
                للجهات الحكومية جداول وشروط خاصة بمسارات الهجرة والتأشيرات. يسرد ملف منارتك بعض القيم التي تُستخدم لمتطلبات IELTS for UKVI ذات المهارات الأربع، مثل{' '}
                <strong dir="ltr" className="text-[#0E7C86] dark:text-[#38C6D4]">B1 = 4.0</strong>، و
                <strong dir="ltr" className="text-[#0E7C86] dark:text-[#38C6D4]">B2 = 5.5</strong>، و
                <strong dir="ltr" className="text-[#0E7C86] dark:text-[#38C6D4]">C1 = 7.0</strong>{' '}
                في كل مهارة في المسارات التي تعتمد ذلك الجدول. لا تعني هذه القيم أنها مطلوبة في جميع التأشيرات، ولا يجوز تحويل CEFR إلى IELTS بمعادلة عامة من دون الرجوع إلى تفاصيل المسار والتاريخ والقواعد الانتقالية.
              </p>

              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify pt-2 border-t border-[var(--mn-border)]/70">
                <span className="relative inline-flex w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] items-center justify-center align-middle ml-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                </span>
                قد يقبل برنامج جامعي اختبارًا أُدي داخل مركز ويرفض IELTS Online؛ وقد تقبل مؤسسة نتيجة الاختبار الكامل ولا تقبل نتيجة One Skill Retake. كذلك تحدد المؤسسات العمر الأقصى المقبول للنتيجة.
              </p>
            </div>

            {/* قبل الحجز — جوهرة نيلي */}
            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
              <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />

              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
                <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                <strong className="text-[var(--mn-heading)]">قبل الحجز:</strong> افتح صفحة الجامعة أو الهيئة أو الجهة الحكومية الرسمية، وحدد نوع IELTS، والدرجة الإجمالية، وحد كل مهارة، وطريقة التقديم، وصلاحية النتيجة، وقبول الإعادة إن كنت تحتاجها. لمتطلبات SELT البريطانية راجع{' '}
                <a
                  href="https://www.gov.uk/guidance/prove-your-english-language-abilities-with-a-secure-english-language-test-selt"
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="ltr"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#0E7C86]/10 border border-[#0E7C86]/35 text-[#0E7C86] dark:text-[#38C6D4] text-[9.5px] font-extrabold hover:border-[#0E7C86] transition-colors align-middle"
                >
                  <span>GOV.UK</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 5: 5. طرق تقديم الاختبار والمتطلبات التقنية                       */}
      {/* ========================================================================= */}
      <div
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mt-4 sm:mt-5 mn-panel font-['Cairo',sans-serif]"
        dir={publicDir}
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

        <DetailSectionHeader
          id="exam-delivery-availability-tech"
          icon={Monitor}
          className="mb-3"
          title="5. طرق تقديم الاختبار والمتطلبات التقنية"
        />

        <div className="space-y-3 text-start w-full">
          {/* مقدمة القسم الخامس — نقطة مزدوجة نيلية بترولية مصغرة w-3.5 h-3.5 */}
          <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
            <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
            <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
              <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
              </span>
              تختلف طريقة أداء IELTS عن نوع الاختبار: فقد تختار Academic أو General ثم تؤديه بطريقة متاحة في بلدك ومقبولة لدى الجهة المستقبلة.
            </p>
          </div>

          {/* الطرق الثلاث لتقديم الاختبار — متوازنة بمربع موحد ودائرة مزدوجة نيلية بترولية */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
            {/* 1. IELTS on Computer داخل المركز */}
            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 overflow-hidden shadow-2xs flex flex-col">
              <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-[var(--mn-border)]">
                <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                  <Monitor className="w-3.5 h-3.5 text-white" />
                </span>
                <h3 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug">
                  IELTS on Computer داخل المركز
                </h3>
              </div>
              <div className="flex-1">
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
                  <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  تُؤدى مهارات الاستماع والقراءة والكتابة على الكمبيوتر داخل مركز رسمي، بينما تكون المحادثة مع ممتحن معتمد. تشمل المزايا سرعة ظهور النتائج عادة خلال{' '}
                  <strong className="text-[var(--mn-heading)]">1–5 أيام</strong>، وإمكانية الاستفادة من One Skill Retake إذا كان الاختبار الأصلي والمركز مؤهلين وتحققت شروط الخدمة.
                </p>
              </div>
            </div>

            {/* 2. IELTS on Computer مع Writing on Paper */}
            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 overflow-hidden shadow-2xs flex flex-col">
              <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-[var(--mn-border)]">
                <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                  <PenTool className="w-3.5 h-3.5 text-white" />
                </span>
                <h3 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug">
                  IELTS on Computer مع Writing on Paper
                </h3>
              </div>
              <div className="flex-1">
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
                  <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  في دول مختارة، تظهر أسئلة الكتابة على الشاشة لكن يكتب المتقدم الإجابات بالقلم على ورقة مخصصة، بينما تبقى مهارتا الاستماع والقراءة على الكمبيوتر. يتوافق محتوى الكتابة ومعاييرها ومدتها مع الطريقة المحوسبة، وتظهر النتيجة خلال نحو خمسة أيام وفق الإعلان الرسمي. لا يذكر تقرير TRF اختيار هذه الطريقة، ولا تتوفر لـIELTS for UKVI. وعند إعادة كتابة هذه المهارة بخدمة One Skill Retake يجب الحفاظ على طريقة الكتابة الأصلية.
                </p>
              </div>
            </div>

            {/* 3. IELTS Online Academic من المنزل */}
            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 overflow-hidden shadow-2xs sm:col-span-2">
              <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-[var(--mn-border)]">
                <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                  <Laptop className="w-3.5 h-3.5 text-white" />
                </span>
                <h3 className="text-[11px] sm:text-[11.5px] font-bold text-[var(--mn-heading)] leading-snug">
                  IELTS Online Academic من المنزل
                </h3>
              </div>

              <div className="space-y-2">
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
                  <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  يُسمح بأداء Academic فقط من المنزل أو حيز خاص في الدول المدعومة لمن يبلغ{' '}
                  <strong className="text-[var(--mn-heading)]">18 عامًا فأكثر</strong>. تُؤدى الاستماع والقراءة والكتابة على الكمبيوتر، والمحادثة عبر فيديو مباشر مع ممتحن معتمد. لا يقبل IELTS Online لأغراض الهجرة أو التسجيل المهني، ويجب التأكد من قبول الجامعة للنتيجة قبل الدفع.
                </p>

                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify pt-2 border-t border-[var(--mn-border)]/70">
                  <span className="relative inline-flex w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  يتطلب الاختبار جهاز كمبيوتر مكتبيًا أو محمولًا متوافقًا مع Windows أو macOS، وشاشة واحدة وكاميرا وميكروفون ومكبرات صوت واتصالًا ثابتًا، وغرفة خاصة هادئة ومضيئة. لا تُسمح سماعات الرأس أو الملاحظات الورقية أو فتح برامج ومتصفحات أخرى. يمكن تدوين ملاحظات على الشاشة وتعديل الإجابات داخل القسم قبل انتهاء الوقت. وقد تسمح السياسة باستراحة واحدة قصيرة بإذن المراقب في موضع محدد. إذا حدث انقطاع قصير للاتصال فقد يُعوض الوقت المفقود، أما الانقطاع الطويل فقد يستلزم ترتيبات جديدة من الشريك. تُستخدم منصة الاختبار المعتمدة، ويجري الرصد والمراقبة لأغراض النزاهة.
                </p>
              </div>
            </div>
          </div>

          {/* 4. ماذا عن الاختبار الورقي التقليدي؟ — جوهرة نيلي */}
          <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 overflow-hidden shadow-2xs w-full">
            <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
            <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-[var(--mn-border)]">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <FileText className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                ماذا عن الاختبار الورقي التقليدي؟
              </h3>
            </div>

            <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
              <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
              أعلنت IELTS في{' '}
              <strong className="text-[var(--mn-heading)]">5 مارس 2026</strong>{' '}
              أنه ابتداءً من منتصف 2026 ستنتقل تدريجيًا من تقديم الاختبار الورقي المستقل إلى الكمبيوتر، مع اختلاف التوقيت بين الدول. النتائج الورقية السابقة لا تفقد صلاحيتها بسبب هذا الانتقال. ويجب الاستعلام عن حالة الخيار المتاح في بلدك من نظام الحجز الحالي بدل الاعتماد على المواعيد القديمة.
            </p>
          </div>

          {/* جدول طرق الأداء الأربعة بمرجع قسم التخصصات */}
          <div className="-mx-2 sm:-mx-2.5 border-y border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden font-['Cairo',sans-serif]">
            <div className="grid grid-cols-12 bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)] items-center">
              <div className="col-span-3 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white text-start border-l border-white/15">
                طريقة الأداء
              </div>
              <div className="col-span-3 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white text-start border-l border-white/15">
                المكان
              </div>
              <div className="col-span-2 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white text-start border-l border-white/15">
                الكتابة
              </div>
              <div className="col-span-4 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white text-start">
                ملاحظات قبول أساسية
              </div>
            </div>

            <div className="divide-y divide-[var(--mn-border)]">
              {[
                {
                  method: 'IELTS on Computer',
                  place: 'مركز رسمي',
                  writing: 'لوحة مفاتيح',
                  notes: 'بحسب النوع المطلوب',
                },
                {
                  method: 'Computer + Writing on Paper',
                  place: 'مركز مختار',
                  writing: 'بالقلم في Writing',
                  notes: 'غير متاح لـUKVI',
                },
                {
                  method: 'IELTS Online Academic',
                  place: 'المنزل في دولة مدعومة',
                  writing: 'لوحة مفاتيح',
                  notes: 'تأكد من قبول الجامعة؛ ليس للهجرة أو الترخيص المهني',
                },
                {
                  method: 'Paper التقليدي',
                  place: 'مركز إذا بقي متاحًا في السوق',
                  writing: 'بالقلم',
                  notes: 'قيد الإيقاف التدريجي حسب السوق',
                },
              ].map((row) => (
                <div
                  key={row.method}
                  className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors"
                >
                  <div className="col-span-3 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center leading-snug">
                    {row.method}
                  </div>
                  <div className="col-span-3 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] border-l border-[var(--mn-border)] flex items-center leading-snug">
                    {row.place}
                  </div>
                  <div className="col-span-2 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[#0E7C86] dark:text-[#38C6D4] border-l border-[var(--mn-border)] flex items-center leading-snug">
                    {row.writing}
                  </div>
                  <div className="col-span-4 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] flex items-center leading-snug">
                    {row.notes}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* قبل اختيار الطريقة — نقطة نيلي */}
          <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
            <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />

            <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
              <span className="inline-block w-2 h-2 rounded-full bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
              <strong className="text-[var(--mn-heading)]">قبل اختيار الطريقة:</strong> راجع نوع IELTS المقبول لدى الجهة، وتوفر الموعد والمركز، ودرجة راحتك مع الكتابة على الكمبيوتر، والمتطلبات التقنية إن كنت ستختبر من المنزل. من المهم أيضًا الانتباه إلى أن بعض السياسات مثل UKVI لا تقبل الاختبار المنزلي.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 6: 6. هيكل الاختبار ومدته                                          */}
      {/* ========================================================================= */}
      <div
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mt-4 sm:mt-5 mn-panel"
        dir={publicDir}
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

        <DetailSectionHeader
          id="exam-structure-duration"
          icon={Clock}
          className="mb-3"
          title="6. هيكل الاختبار ومدته"
        />

        <div className="space-y-3 text-start w-full">
          {/* الجملة الافتتاحية + جدول المهارات الأربع */}
          <div className="space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                المهارات الأربع ومدتها
              </h3>
            </div>

            <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify px-0.5">
              يتكون IELTS Academic وGeneral Training من أربع مهارات متتابعة في تجربة الاختبار، ولكل مهارة طبيعتها ووقتها:
            </p>

            {/* جدول المهارات الأربع — مطابق لجدول الطب والجراحة */}
            <div className="-mx-2 sm:-mx-2.5 border-y border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden font-['Cairo',sans-serif]">
              <div className="grid grid-cols-12 bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)]">
                <div className="col-span-5 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white border-l border-white/15 flex items-center">
                  المهارة
                </div>
                <div className="col-span-3 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white border-l border-white/15 flex items-center">
                  المدة
                </div>
                <div className="col-span-4 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white flex items-center">
                  الأسئلة أو المهام
                </div>
              </div>

              <div className="divide-y divide-[var(--mn-border)]">
                {[
                  {
                    skill: 'الاستماع — Listening',
                    duration: 'نحو 30 دقيقة',
                    tasks: '40 سؤالًا في 4 أجزاء',
                    Icon: Headphones,
                  },
                  {
                    skill: 'القراءة — Reading',
                    duration: '60 دقيقة',
                    tasks: '40 سؤالًا في 3 أقسام',
                    Icon: BookOpen,
                  },
                  {
                    skill: 'الكتابة — Writing',
                    duration: '60 دقيقة',
                    tasks: 'مهمتان',
                    Icon: PenTool,
                  },
                  {
                    skill: 'المحادثة — Speaking',
                    duration: '11–14 دقيقة',
                    tasks: '3 أجزاء',
                    Icon: Mic,
                  },
                ].map((row) => {
                  const RowIcon = row.Icon;
                  return (
                    <div
                      key={row.skill}
                      className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors"
                    >
                      <div className="col-span-5 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center gap-1.5 leading-snug">
                        <span className="w-5 h-5 rounded-md bg-[#0E7C86] border border-[#142B5F] flex items-center justify-center shrink-0">
                          <RowIcon className="w-2.5 h-2.5 text-white" />
                        </span>
                        <span>{row.skill}</span>
                      </div>
                      <div className="col-span-3 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[#0E7C86] dark:text-[#38C6D4] border-l border-[var(--mn-border)] flex items-center leading-snug">
                        {row.duration}
                      </div>
                      <div className="col-span-4 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] flex items-center leading-snug">
                        {row.tasks}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* الفقرة الأولى بعد الجدول — خط عادي بترولي + جوهرة نيلي */}
          <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
            <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[#0E7C86] dark:bg-[#38C6D4]" />

            <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
              تبلغ مدة الاختبار <strong className="text-[var(--mn-heading)]">نحو ساعتين و45 دقيقة</strong>. تُؤدى أقسام Listening وReading وWriting في المركز عادة ضمن جلسة متصلة من دون استراحة رسمية. وقد تُجرى المحادثة في اليوم نفسه أو قبله أو بعده وفق جدول المركز؛ وفي IELTS Online تُحدد ترتيبات الجلسات حسب نظام الحجز.
            </p>
          </div>

          {/* الفقرة الثانية بعد الجدول — خط عادي بترولي + جوهرة نيلي */}
          <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
            <span className="absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[#0E7C86] dark:bg-[#38C6D4]" />

            <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
              <strong className="text-[var(--mn-heading)]">خصص وقتًا إضافيًا</strong> للتحقق من الهوية والتصوير والإجراءات الأمنية والانتظار. لا تُحسب هذه الإجراءات بالضرورة ضمن مدة أداء المهارات، ولا ينبغي أن تصل إلى المركز عند موعد بداية الاختبار تمامًا.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 7: 7. أقسام الاختبار وأنواع الأسئلة                                */}
      {/* ========================================================================= */}
      <div
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mt-4 sm:mt-5 mn-panel"
        dir={publicDir}
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

        <DetailSectionHeader
          id="exam-sections-skills-questions"
          icon={BookOpen}
          className="mb-3"
          title="7. أقسام الاختبار وأنواع الأسئلة"
        />

        <div className="space-y-4 text-start w-full">
          {/* ===================================================================== */}
          {/* أولًا: الاستماع — Listening                                            */}
          {/* ===================================================================== */}
          <div className="space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Headphones className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                أولًا: الاستماع — Listening
              </h3>
            </div>

            <div className="space-y-2 w-full">
              <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs overflow-hidden w-full">
                <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  يقيس قدرة المتقدم على فهم الإنجليزية المسموعة في الحياة اليومية والدراسة. يتكون من{' '}
                  <strong className="text-[var(--mn-heading)]">40 سؤالًا</strong>{' '}
                  موزعة على أربعة أجزاء، عشرة أسئلة لكل جزء، ويُشغّل التسجيل مرة واحدة. تُمنح نقطة لكل إجابة صحيحة قبل تحويل العدد إلى Band.
                </p>
              </div>

              {/* الأجزاء الأربعة — نقطة بترولي بدون مربع داخل مربع */}
              <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 space-y-2 shadow-2xs overflow-hidden w-full">
                <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
                <div className="flex items-center gap-1.5">
                  <span className="relative w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] flex items-center justify-center shrink-0">
                    <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  <h4 className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)]">
                    الأجزاء الأربعة:
                  </h4>
                </div>

                <div className="divide-y divide-[var(--mn-border)]/70">
                  {[
                    {
                      num: 'الجزء 1:',
                      text: 'محادثة يومية بين شخصين، مثل الاستفسار أو الحجز.',
                    },
                    {
                      num: 'الجزء 2:',
                      text: 'حديث فردي في سياق اجتماعي، مثل تقديم معلومات للزوار.',
                    },
                    {
                      num: 'الجزء 3:',
                      text: 'مناقشة بين أشخاص في سياق تعليمي أو تدريبي، مثل مشروع دراسي.',
                    },
                    {
                      num: 'الجزء 4:',
                      text: 'حديث أكاديمي أكثر امتدادًا، مثل محاضرة.',
                    },
                  ].map((part) => (
                    <div key={part.num} className="py-1.5 first:pt-0.5 last:pb-0">
                      <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                        <strong className="text-[var(--mn-heading)] ml-1">{part.num}</strong>
                        {part.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* أنواع الأسئلة — زاوية هندسية */}
              <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs overflow-hidden w-full">
                <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
                <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="relative inline-flex w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  <strong className="text-[var(--mn-heading)]">أنواع الأسئلة:</strong>{' '}
                  الاختيار من متعدد (Multiple Choice)، والمطابقة (Matching)، وتسمية الخرائط والمخططات (Map/Plan/Diagram Labelling)، وإكمال النماذج والملاحظات والجداول والمخططات الانسيابية والملخصات، وإكمال الجمل، والإجابات القصيرة.
                </p>
              </div>

              {/* قواعد مهمة — جوهرة نيلي */}
              <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs overflow-hidden w-full">
                <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[#0E7C86] dark:bg-[#38C6D4]" />
                <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                  <strong className="text-[var(--mn-heading)]">قواعد مهمة:</strong> تظهر الإجابات غالبًا بترتيب التسجيل؛ احترم حد الكلمات المكتوب، وانتبه إلى الإملاء والأرقام والأسماء، واستعد للهجات معيارية بريطانية وأسترالية ونيوزيلندية وأمريكية شمالية. لا تفترض إمكانية إعادة تشغيل المقطع.
                </p>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* ثانيًا: القراءة — Reading                                              */}
          {/* ===================================================================== */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <BookOpen className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                ثانيًا: القراءة — Reading
              </h3>
            </div>

            <div className="space-y-2 w-full">
              <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs overflow-hidden w-full">
                <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  يقيس فهم الفكرة الرئيسية والتفاصيل والاستنتاج وموقف الكاتب وبنية النص ومعاني الكلمات من السياق. يستغرق{' '}
                  <strong className="text-[var(--mn-heading)]">60 دقيقة</strong>{' '}
                  ويضم{' '}
                  <strong className="text-[var(--mn-heading)]">40 سؤالًا</strong>، دون وقت إضافي لنقل الإجابات بعد انتهاء مدة القراءة.
                </p>
              </div>

              {/* المسار الأول: القراءة الأكاديمية */}
              <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs overflow-hidden w-full">
                <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
                <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="relative inline-flex w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  <strong className="text-[var(--mn-heading)]">القراءة الأكاديمية (Academic Reading):</strong>{' '}
                  تتكون من ثلاثة نصوص طويلة نسبيًا، بإجمالي تقريبي{' '}
                  <strong className="text-[var(--mn-heading)]">2,150–2,750 كلمة</strong>، وتُختار موادها من كتب ودوريات ومجلات وصحف. تشمل الأسئلة الاختيار من متعدد، وTrue/False/Not Given، وYes/No/Not Given، ومطابقة العناوين والمعلومات والسمات ونهايات الجمل، وإكمال الجمل والجداول والملخصات، وتسمية المخططات، والإجابات القصيرة.
                </p>
              </div>

              {/* المسار الثاني: القراءة العامة — الأقسام الثلاثة بنقطة بترولي */}
              <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 space-y-2 shadow-2xs overflow-hidden w-full">
                <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
                <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.85]">
                  <span className="relative inline-flex w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  <strong className="text-[var(--mn-heading)]">القراءة العامة (General Training Reading):</strong>{' '}
                  تتضمن ثلاثة أقسام متدرجة في الصعوبة:
                </p>

                <div className="divide-y divide-[var(--mn-border)]/70">
                  {[
                    {
                      num: 'القسم 1:',
                      text: 'نصوص قصيرة من الحياة اليومية كالإعلانات والإشعارات والجداول والخدمات.',
                    },
                    {
                      num: 'القسم 2:',
                      text: 'نصوص مرتبطة بالعمل مثل السياسات والتدريب والوصف الوظيفي.',
                    },
                    {
                      num: 'القسم 3:',
                      text: 'نصًا أطول وأكثر تعقيدًا في موضوع عام.',
                    },
                  ].map((item) => (
                    <div key={item.num} className="py-1.5 first:pt-0.5 last:pb-0">
                      <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                        <strong className="text-[var(--mn-heading)] ml-1">{item.num}</strong>
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ملاحظة مقارنة القراءة الأكاديمية والعامة — جوهرة نيلي */}
              <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs overflow-hidden w-full">
                <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[#0E7C86] dark:bg-[#38C6D4]" />
                <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                  تتشابه أشكال الأسئلة مع القراءة الأكاديمية، لكن السياقات تميل إلى الحياة والعمل. ويحتاج General Training عادةً إلى عدد أكبر من الإجابات الصحيحة للحصول على Band مماثل، لأن طبيعة نصوص Academic تختلف في درجة التعقيد. جداول التحويل التقريبية موجودة في قسم الدرجات.
                </p>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* ثالثًا: الكتابة — Writing                                              */}
          {/* ===================================================================== */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <PenTool className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                ثالثًا: الكتابة — Writing
              </h3>
            </div>

            <div className="space-y-2 w-full">
              <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs overflow-hidden w-full">
                <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  يضم قسم الكتابة مهمتين خلال <strong className="text-[var(--mn-heading)]">60 دقيقة</strong>. الوقت المقترح{' '}
                  <strong className="text-[var(--mn-heading)]">20 دقيقة</strong> للمهمة الأولى و
                  <strong className="text-[var(--mn-heading)]">40 دقيقة</strong> للمهمة الثانية، ويبلغ الحد الأدنى للكلمات{' '}
                  <strong className="text-[var(--mn-heading)]">150</strong> في الأولى و
                  <strong className="text-[var(--mn-heading)]">250</strong> في الثانية. تحمل Task 2 ضعف وزن Task 1 في التقييم.
                </p>
              </div>

              {/* الشبكة المزدوجة لـ Academic Writing و General Training Writing — بدون مربع داخل مربع */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Academic Writing */}
                <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 space-y-2 shadow-2xs overflow-hidden flex flex-col">
                  <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
                  <div className="flex items-center gap-1.5">
                    <span className="relative w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                    </span>
                    <h4 dir="ltr" className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)]">
                      Academic Writing:
                    </h4>
                  </div>

                  <div className="divide-y divide-[var(--mn-border)]/70 flex-1">
                    <div className="py-1.5 first:pt-0.5">
                      <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                        <strong className="text-[var(--mn-heading)]">Task 1:</strong>{' '}
                        وصف أو تلخيص معلومات مرئية، مثل رسم بياني (Graph)، أو Chart، أو Table، أو Map، أو Diagram، أو Process. يجب إبراز المعلومات والاتجاهات الرئيسية وتقديم نظرة عامة (Overview) واضحة دون إدخال رأي شخصي لا يطلبه السؤال.
                      </p>
                    </div>

                    <div className="py-1.5 last:pb-0">
                      <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                        <strong className="text-[var(--mn-heading)]">Task 2:</strong>{' '}
                        كتابة مقال يناقش رأيًا أو حجة أو مشكلة وأسبابها وحلولها أو المزايا والعيوب. يتطلب موقفًا واضحًا وأفكارًا مترابطة وتطويرًا مناسبًا للأمثلة.
                      </p>
                    </div>
                  </div>
                </div>

                {/* General Training Writing */}
                <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 space-y-2 shadow-2xs overflow-hidden flex flex-col">
                  <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
                  <div className="flex items-center gap-1.5">
                    <span className="relative w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                    </span>
                    <h4 dir="ltr" className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)]">
                      General Training Writing:
                    </h4>
                  </div>

                  <div className="divide-y divide-[var(--mn-border)]/70 flex-1">
                    <div className="py-1.5 first:pt-0.5">
                      <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                        <strong className="text-[var(--mn-heading)]">Task 1:</strong>{' '}
                        رسالة تستجيب لموقف مثل طلب معلومات أو شكوى أو اعتذار أو دعوة، بنبرة رسمية أو شبه رسمية أو شخصية بحسب السؤال، مع تغطية كل النقاط المطلوبة.
                      </p>
                    </div>

                    <div className="py-1.5 last:pb-0">
                      <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                        <strong className="text-[var(--mn-heading)]">Task 2:</strong>{' '}
                        مقال عن قضية عامة أو رأي أو حجة أو حل مشكلة، ويظل تحقيق المطلوب وتنظيمه ودقة اللغة أساسيًا في التقييم.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* معايير تقييم الكتابة — جوهرة نيلي */}
              <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs overflow-hidden w-full">
                <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[#0E7C86] dark:bg-[#38C6D4]" />
                <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                  تُقيَّم الكتابة وفق Task Achievement/Task Response، وCoherence and Cohesion، وLexical Resource، وGrammatical Range and Accuracy. تتساوى هذه المعايير الأربعة داخل كل مهمة، مع بقاء وزن المهمة الثانية مضاعفًا. احرص على كتابة فقرات كاملة وتغطية المطلوب والالتزام بحد الكلمات؛ قد تؤثر الإجابات القصيرة أو غير المرتبطة بالسؤال سلبًا في النتيجة. لا تعتمد على نسخ نص السؤال أو حفظ مقالات جاهزة.
                </p>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* رابعًا: المحادثة — Speaking                                           */}
          {/* ===================================================================== */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Mic className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                رابعًا: المحادثة — Speaking
              </h3>
            </div>

            <div className="space-y-2 w-full">
              <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs overflow-hidden w-full">
                <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  مقابلة مسجلة مع ممتحن IELTS معتمد، مدتها{' '}
                  <strong className="text-[var(--mn-heading)]">11–14 دقيقة</strong>، ومحتواها متطابق في Academic وGeneral Training. وقد تُجرى حضوريًا أو عبر اتصال فيديو مع ممتحن حسب ترتيبات الجهة والمركز.
                </p>
              </div>

              {/* أجزاء المحادثة الثلاثة — نقطة بترولي بدون مربع داخل مربع */}
              <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 space-y-2 shadow-2xs overflow-hidden w-full">
                <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
                <div className="flex items-center gap-1.5">
                  <span className="relative w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] flex items-center justify-center shrink-0">
                    <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  <h4 className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)]">
                    الأجزاء الثلاثة للمقابلة:
                  </h4>
                </div>

                <div className="divide-y divide-[var(--mn-border)]/70">
                  {[
                    {
                      label: 'Part 1 (نحو 4–5 دقائق):',
                      text: 'أسئلة عن الأسرة والسكن والدراسة والعمل والهوايات والموضوعات الشخصية المألوفة.',
                    },
                    {
                      label: 'Part 2:',
                      text: 'بطاقة موضوع مع دقيقة للتحضير، ثم حديث لمدة 1–2 دقيقة، وقد يلي ذلك سؤال أو اثنان.',
                    },
                    {
                      label: 'Part 3 (نحو 4–5 دقائق):',
                      text: 'مناقشة أعمق حول أفكار وأسباب ومقارنات ووجهات نظر مرتبطة بموضوع الجزء الثاني.',
                    },
                  ].map((part) => (
                    <div key={part.label} className="py-1.5 first:pt-0.5 last:pb-0">
                      <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                        <strong className="text-[var(--mn-heading)] ml-1">{part.label}</strong>
                        {part.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* معايير تقييم المحادثة — جوهرة نيلي */}
              <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs overflow-hidden w-full">
                <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[#0E7C86] dark:bg-[#38C6D4]" />
                <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                  المعايير الأربعة هي Fluency and Coherence، وLexical Resource، وGrammatical Range and Accuracy، وPronunciation، ولكل منها وزن متساوٍ. لا يشترط تقليد لهجة بريطانية؛ الأهم الوضوح والطلاقة وتنظيم الحديث. وقد تقلل الإجابات المحفوظة بصورة آلية من طبيعية الأداء.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 8: 8. نظام الدرجات وتقييم الأداء                                  */}
      {/* ========================================================================= */}
      <div
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mt-4 sm:mt-5 mn-panel"
        dir={publicDir}
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

        <DetailSectionHeader
          id="exam-scoring-system-interpretation"
          icon={BarChart3}
          className="mb-3"
          title="8. نظام الدرجات وتقييم الأداء"
        />

        <div className="space-y-4 text-start w-full">
          {/* 1. الدرجات والـOverall */}
          <div className="space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <BarChart3 className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                الدرجات والـOverall
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 space-y-2 shadow-2xs overflow-hidden w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                </span>
                تُمنح لكل مهارة من المهارات الأربع درجة Band من{' '}
                <strong className="text-[var(--mn-heading)]">0 إلى 9</strong>، وقد تكون الدرجة عددًا صحيحًا أو نصف درجة. ويُحسب Overall Band Score من متوسط المهارات:
              </p>

              <div
                dir="ltr"
                className="py-1.5 border-y border-[var(--mn-border)]/70 text-center text-[10px] sm:text-[10.5px] font-bold text-[#0E7C86] dark:text-[#38C6D4]"
              >
                Overall = (Listening + Reading + Writing + Speaking) ÷ 4
              </div>

              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                ثم يُطبّق التقريب الرسمي: متوسط{' '}
                <strong dir="ltr" className="text-[var(--mn-heading)]">6.25</strong> يصبح{' '}
                <strong dir="ltr" className="text-[var(--mn-heading)]">6.5</strong>، ومتوسط{' '}
                <strong dir="ltr" className="text-[var(--mn-heading)]">6.75</strong> يصبح{' '}
                <strong dir="ltr" className="text-[var(--mn-heading)]">7.0</strong>، وتُقرب القيم الأخرى إلى أقرب نصف Band أو عدد صحيح بحسب موقعها.
              </p>
            </div>

            {/* جدول أمثلة التقريب */}
            <div className="-mx-2 sm:-mx-2.5 border-y border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden font-['Cairo',sans-serif]">
              <div className="grid grid-cols-12 bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)] text-center">
                <div dir="ltr" className="col-span-2 py-2 px-1 text-[9.5px] sm:text-[11px] font-bold text-white border-l border-white/15 flex items-center justify-center">
                  Listening
                </div>
                <div dir="ltr" className="col-span-2 py-2 px-1 text-[9.5px] sm:text-[11px] font-bold text-white border-l border-white/15 flex items-center justify-center">
                  Reading
                </div>
                <div dir="ltr" className="col-span-2 py-2 px-1 text-[9.5px] sm:text-[11px] font-bold text-white border-l border-white/15 flex items-center justify-center">
                  Writing
                </div>
                <div dir="ltr" className="col-span-2 py-2 px-1 text-[9.5px] sm:text-[11px] font-bold text-white border-l border-white/15 flex items-center justify-center">
                  Speaking
                </div>
                <div className="col-span-2 py-2 px-1 text-[9.5px] sm:text-[11px] font-bold text-white border-l border-white/15 flex items-center justify-center">
                  المتوسط
                </div>
                <div dir="ltr" className="col-span-2 py-2 px-1 text-[9.5px] sm:text-[11px] font-bold text-white flex items-center justify-center">
                  Overall
                </div>
              </div>

              <div className="divide-y divide-[var(--mn-border)]">
                {[
                  { l: '6.5', r: '6.5', w: '5.0', s: '7.0', avg: '6.25', overall: '6.5' },
                  { l: '4.0', r: '3.5', w: '4.0', s: '4.0', avg: '3.875', overall: '4.0' },
                  { l: '6.5', r: '6.5', w: '5.5', s: '6.0', avg: '6.125', overall: '6.0' },
                ].map((ex, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors text-center"
                  >
                    <div dir="ltr" className="col-span-2 py-2 px-1 text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center justify-center">
                      {ex.l}
                    </div>
                    <div dir="ltr" className="col-span-2 py-2 px-1 text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center justify-center">
                      {ex.r}
                    </div>
                    <div dir="ltr" className="col-span-2 py-2 px-1 text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center justify-center">
                      {ex.w}
                    </div>
                    <div dir="ltr" className="col-span-2 py-2 px-1 text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center justify-center">
                      {ex.s}
                    </div>
                    <div dir="ltr" className="col-span-2 py-2 px-1 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] border-l border-[var(--mn-border)] flex items-center justify-center">
                      {ex.avg}
                    </div>
                    <div dir="ltr" className="col-span-2 py-2 px-1 text-[10.5px] sm:text-[11px] font-bold text-[#0E7C86] dark:text-[#38C6D4] flex items-center justify-center">
                      {ex.overall}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. ماذا تعني مستويات Band؟ */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Award className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                ماذا تعني مستويات Band؟
              </h3>
            </div>

            <div className="-mx-2 sm:-mx-2.5 border-y border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden font-['Cairo',sans-serif]">
              <div className="grid grid-cols-12 bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)]">
                <div dir="ltr" className="col-span-2 py-2.5 px-2 text-[10.5px] sm:text-[11.5px] font-bold text-white border-l border-white/15 flex items-center justify-center text-center">
                  Band
                </div>
                <div className="col-span-4 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white border-l border-white/15 flex items-center">
                  الاسم الرسمي
                </div>
                <div className="col-span-6 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white flex items-center">
                  المعنى المختصر
                </div>
              </div>

              <div className="divide-y divide-[var(--mn-border)]">
                {[
                  { band: '9', name: 'Expert', desc: 'تحكم كامل ودقيق وطليق' },
                  { band: '8', name: 'Very Good', desc: 'تحكم قوي مع أخطاء عرضية' },
                  { band: '7', name: 'Good', desc: 'مستوى جيد مع بعض الأخطاء' },
                  { band: '6', name: 'Competent', desc: 'استخدام فعّال رغم بعض الأخطاء' },
                  { band: '5', name: 'Modest', desc: 'تحكم جزئي وأخطاء متكررة' },
                  { band: '4', name: 'Limited', desc: 'قدرة محدودة' },
                  { band: '3', name: 'Extremely Limited', desc: 'فهم محدود في المواقف المألوفة' },
                  { band: '2', name: 'Intermittent', desc: 'صعوبة كبيرة في الفهم والاستخدام' },
                  { band: '1', name: 'Non-user', desc: 'استخدام كلمات منفصلة قليلة' },
                  { band: '0', name: 'Did Not Attempt', desc: 'لم يحاول أداء الاختبار' },
                ].map((item) => (
                  <div
                    key={item.band}
                    className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors"
                  >
                    <div dir="ltr" className="col-span-2 py-2 px-2 text-[10.5px] sm:text-[11px] font-bold text-[#0E7C86] dark:text-[#38C6D4] border-l border-[var(--mn-border)] flex items-center justify-center text-center">
                      {item.band}
                    </div>
                    <div dir="ltr" className="col-span-4 py-2 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center">
                      {item.name}
                    </div>
                    <div className="col-span-6 py-2 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] flex items-center">
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. تحويل الإجابات الصحيحة إلى Band */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                تحويل الإجابات الصحيحة إلى Band
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs overflow-hidden w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                </span>
                في Listening وReading تُمنح نقطة لكل إجابة صحيحة من أصل{' '}
                <strong className="text-[var(--mn-heading)]">40</strong>، ثم يُحوَّل العدد إلى Band. الجداول التالية متوسطات تقريبية رسمية وردت في الملف المرجعي؛ وقد تختلف حدود التحويل قليلًا بين النماذج، ولا ينبغي اعتمادها كجدول قطعي لحساب كل نتيجة.
              </p>
            </div>

            <div className="-mx-2 sm:-mx-2.5 border-y border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden font-['Cairo',sans-serif]">
              <div className="grid grid-cols-12 bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)] text-center">
                <div dir="ltr" className="col-span-3 py-2.5 px-2 text-[10px] sm:text-[11px] font-bold text-white border-l border-white/15 flex items-center justify-center">
                  Band
                </div>
                <div className="col-span-3 py-2.5 px-2 text-[10px] sm:text-[11px] font-bold text-white border-l border-white/15 flex items-center justify-center">
                  Listening: صحيح من 40
                </div>
                <div dir="ltr" className="col-span-3 py-2.5 px-2 text-[10px] sm:text-[11px] font-bold text-white border-l border-white/15 flex items-center justify-center">
                  Academic Reading
                </div>
                <div dir="ltr" className="col-span-3 py-2.5 px-2 text-[10px] sm:text-[11px] font-bold text-white flex items-center justify-center">
                  General Training Reading
                </div>
              </div>

              <div className="divide-y divide-[var(--mn-border)]">
                {[
                  { band: '4', listening: '—', academic: '—', general: '15' },
                  { band: '5', listening: '16', academic: '15', general: '23' },
                  { band: '6', listening: '23', academic: '23', general: '30' },
                  { band: '7', listening: '30', academic: '30', general: '35' },
                  { band: '8', listening: '35', academic: '35', general: '—' },
                ].map((row) => (
                  <div
                    key={row.band}
                    className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors text-center"
                  >
                    <div dir="ltr" className="col-span-3 py-2 px-2 text-[10.5px] sm:text-[11px] font-bold text-[#0E7C86] dark:text-[#38C6D4] border-l border-[var(--mn-border)] flex items-center justify-center">
                      {row.band}
                    </div>
                    <div className="col-span-3 py-2 px-2 text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center justify-center">
                      {row.listening}
                    </div>
                    <div dir="ltr" className="col-span-3 py-2 px-2 text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center justify-center">
                      {row.academic}
                    </div>
                    <div dir="ltr" className="col-span-3 py-2 px-2 text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] flex items-center justify-center">
                      {row.general}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs overflow-hidden w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[#0E7C86] dark:bg-[#38C6D4]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                لا توجد نقاط سالبة عن الإجابات الخاطئة في الاستماع والقراءة. أما الكتابة والمحادثة فتُقيّمان وفق معايير الأداء التفصيلية المذكورة في القسم السابق، وليس بعدّ الإجابات الصحيحة.
              </p>
            </div>
          </div>

          {/* 4. علاقة IELTS بمستويات CEFR */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Globe className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                علاقة IELTS بمستويات CEFR
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs overflow-hidden w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="relative inline-flex w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] items-center justify-center align-middle ml-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                </span>
                الإطار الأوروبي المرجعي المشترك للغات (CEFR) يصف مستويات استخدام اللغة، لكن العلاقة بينه وبين Band في IELTS إرشادية وليست مطابقة حسابية دقيقة. وفق ملف منارتك: تقع حدود{' '}
                <strong dir="ltr" className="text-[var(--mn-heading)]">C1</strong> تقريبًا عند{' '}
                <strong dir="ltr" className="text-[var(--mn-heading)]">6.5–7</strong>، و
                <strong dir="ltr" className="text-[var(--mn-heading)]">Band 8</strong> قريب من حدود{' '}
                <strong dir="ltr" className="text-[var(--mn-heading)]">C2</strong>، بينما يرتبط{' '}
                <strong dir="ltr" className="text-[var(--mn-heading)]">Band 8.5</strong> فأعلى بمستوى{' '}
                <strong dir="ltr" className="text-[var(--mn-heading)]">C2</strong> في خريطة IELTS. لا تُحوِّل متطلب تأشيرة إلى درجة اعتمادًا على هذا التقدير؛ فالجداول الرسمية للمسار هي المرجع.
              </p>
            </div>

            {/* النجاح والقبول — جوهرة نيلي */}
            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[#0E7C86] dark:bg-[#38C6D4]" />

              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                <strong className="text-[var(--mn-heading)]">النجاح والقبول:</strong> لا توجد درجة نجاح عامة في اختبار IELTS الكامل. قد تحصل على Overall مرتفع ولا تحقق حد الكتابة أو المحادثة الذي تشترطه جهة معينة. وتختلف نتيجة Life Skills الذي يعتمد Pass/Fail.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 9: 9. التحضير لاختبار IELTS والمواد التدريبية                     */}
      {/* ========================================================================= */}
      <div
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mt-4 sm:mt-5 mn-panel"
        dir={publicDir}
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

        <DetailSectionHeader
          id="exam-prep-resources"
          icon={GraduationCap}
          className="mb-3"
          title="9. التحضير لاختبار IELTS والمواد التدريبية"
        />

        <div className="space-y-4 text-start w-full">
          {/* 1. كيف تبدأ التحضير؟ */}
          <div className="space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Compass className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                كيف تبدأ التحضير؟
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 space-y-2 shadow-2xs overflow-hidden w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                </span>
                ابدأ بتحديد الهدف الحقيقي: الدرجة الإجمالية المطلوبة، وحد كل مهارة، وتاريخ تقديم الجامعة أو المنحة، والنسخة المعتمدة من الاختبار. بعد ذلك أدِّ اختبارًا تشخيصيًا كاملًا تحت الوقت لمعرفة مستواك الحالي ونقاط قوتك وضعفك. لا توجد خطة واحدة تناسب الجميع؛ فالطالب الذي يستهدف{' '}
                <strong dir="ltr" className="text-[var(--mn-heading)]">5.5</strong> يختلف عن المتقدم الذي يحتاج{' '}
                <strong dir="ltr" className="text-[var(--mn-heading)]">7.5</strong>.
              </p>

              <div className="pt-2 border-t border-[var(--mn-border)]/70">
                <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="relative inline-flex w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  على سبيل المثال، إذا كان مستواك{' '}
                  <strong dir="ltr" className="text-[var(--mn-heading)]">Overall 6.0</strong> و
                  <strong dir="ltr" className="text-[var(--mn-heading)]">Writing 5.5</strong>، بينما يتطلب هدفك{' '}
                  <strong dir="ltr" className="text-[var(--mn-heading)]">Overall 7.0</strong> و
                  <strong dir="ltr" className="text-[var(--mn-heading)]">Writing 6.5</strong>، فعليك تحسين الأداء العام مع إعطاء الكتابة تدريبًا إضافيًا وفق معايير التصحيح الرسمية.
                </p>
              </div>
            </div>
          </div>

          {/* 2. كيف تتدرب على المهارات الأربع؟ — مربعات بلون واحد وزاوية هندسية + نقطة بترولي */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <BookOpen className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                كيف تتدرب على المهارات الأربع؟
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              {[
                {
                  title: 'Listening:',
                  text: 'مارس فهم اللهجات، وتحديد الكلمات المفتاحية، والإملاء والأرقام والأسماء، والتنبؤ بنوع الإجابة، والتعامل مع التسجيل مرة واحدة.',
                },
                {
                  title: 'Reading:',
                  text: 'تدرب على الفكرة الرئيسة والبحث عن المعلومات والتمييز بين True/False/Not Given وYes/No/Not Given، وإدارة الستين دقيقة، وفهم موقف الكاتب والاستنتاجات.',
                },
                {
                  title: 'Writing:',
                  text: 'اقرأ معايير Band Descriptors، وتدرب على بناء الفقرات وتطوير الأفكار والمفردات، وخصّص تدريبًا منفصلًا لـTask 1 وTask 2، وتعلم مراجعة الأخطاء بدل حفظ المقالات.',
                },
                {
                  title: 'Speaking:',
                  text: 'تحدث بصورة متكررة، وسجل إجاباتك وراجعها، ودرب نفسك على الأجزاء الثلاثة، وعلى توضيح الرأي وإعطاء أمثلة مع الحفاظ على النطق الواضح.',
                },
              ].map((skill) => (
                <div
                  key={skill.title}
                  className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 space-y-1.5 overflow-hidden shadow-2xs flex flex-col"
                >
                  <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
                  <div className="flex items-center gap-1.5">
                    <span className="relative w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                    </span>
                    <h4 dir="ltr" className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)]">
                      {skill.title}
                    </h4>
                  </div>
                  <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify flex-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                    {skill.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. خطة تحضير مقترحة لمدة 12 أسبوعًا */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <CalendarCheck className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                خطة تحضير مقترحة لمدة 12 أسبوعًا
              </h3>
            </div>

            <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.8] px-0.5">
              هذه خطة نموذجية قابلة للتعديل، وليست المدة الإلزامية للاستعداد:
            </p>

            {/* جدول خطة 12 أسبوعًا */}
            <div className="-mx-2 sm:-mx-2.5 border-y border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden font-['Cairo',sans-serif]">
              <div className="grid grid-cols-12 bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)]">
                <div className="col-span-4 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white border-l border-white/15 flex items-center">
                  الفترة
                </div>
                <div className="col-span-8 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white flex items-center">
                  النشاط الأساسي
                </div>
              </div>

              <div className="divide-y divide-[var(--mn-border)]">
                {[
                  { weeks: 'الأسبوع الأول', focus: 'تشخيص المستوى والتعرف على بنية الاختبار' },
                  { weeks: 'الأسبوعان 2–3', focus: 'استماع مكثف ومعالجة الأخطاء' },
                  { weeks: 'الأسبوعان 4–5', focus: 'قراءة وتدريب على إدارة الوقت' },
                  { weeks: 'الأسبوعان 6–7', focus: 'Writing Task 1 بحسب نوع الاختبار' },
                  { weeks: 'الأسبوعان 8–9', focus: 'Writing Task 2 والمراجعة وفق المعايير' },
                  { weeks: 'الأسبوع العاشر', focus: 'تدريب مكثف على Speaking' },
                  { weeks: 'الأسبوع الحادي عشر', focus: 'اختبارات تجريبية كاملة' },
                  { weeks: 'الأسبوع الثاني عشر', focus: 'معالجة نقاط الضعف والمحاكاة النهائية' },
                ].map((row) => (
                  <div
                    key={row.weeks}
                    className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors"
                  >
                    <div className="col-span-4 py-2 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center">
                      {row.weeks}
                    </div>
                    <div className="col-span-8 py-2 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] flex items-center">
                      {row.focus}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* نصيحة استمرارية الممارسة — جوهرة نيلي */}
            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[#0E7C86] dark:bg-[#38C6D4]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                مارس جميع المهارات بصورة مستمرة طوال الأسابيع، حتى عندما تكون مهارة واحدة محور التدريب. ونفّذ المحاكاة من دون قاموس أو هاتف أو توقف غير مسموح، ودرّب نفسك على الكمبيوتر إذا كنت ستؤدي الاختبار محوسبًا، وعلى Writing on Paper إذا كان خيارك المؤكد.
              </p>
            </div>
          </div>

          {/* 4. الموارد الرسمية والاستعداد النهائي */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <FileText className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                الموارد الرسمية والاستعداد النهائي
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 space-y-2 shadow-2xs overflow-hidden w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                </span>
                توفر IELTS مواد لأقسام Academic وGeneral Training وLife Skills، وأمثلة أسئلة، وأدلة مهارات، ووصف معايير الدرجات، وفيديوهات، وقد تتوفر اختبارات تجريبية في بعض المراكز. ابدأ من{' '}
                <a
                  href="https://ielts.org/take-a-test/preparation-resources/sample-test-questions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#0E7C86]/10 border border-[#0E7C86]/40 text-[#0E7C86] dark:text-[#38C6D4] text-[9.5px] font-bold hover:border-[#0E7C86] transition-colors align-middle"
                >
                  <span>نماذج وأسئلة IELTS الرسمية</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                .
              </p>

              <div className="pt-2 border-t border-[var(--mn-border)]/70">
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                  تكون أقرب إلى الجاهزية عندما تستطيع إكمال الاختبارات التجريبية في زمنها وتحقق نتائج مستقرة قريبة من متطلبات جهتك، وتعرف أنواع الأسئلة وأسباب أخطائك. تجنب الأخطاء الشائعة مثل التدريب العشوائي، وحفظ الإجابات، وإهمال مهارة منخفضة، وعدم مراجعة نتائج المحاكاة.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 10: 10. مراكز اختبار IELTS والمواعيد والرسوم                      */}
      {/* ========================================================================= */}
      <div
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mt-4 sm:mt-5 mn-panel"
        dir={publicDir}
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

        <DetailSectionHeader
          id="exam-centres-schedules-fees"
          icon={MapPin}
          className="mb-3"
          title="10. مراكز اختبار IELTS والمواعيد والرسوم"
        />

        <div className="space-y-4 text-start w-full">
          {/* 1. أين تجد مركز اختبار رسميًا؟ */}
          <div className="space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <MapPin className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                أين تجد مركز اختبار رسميًا؟
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 overflow-hidden shadow-2xs w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                </span>
                ابحث في{' '}
                <a
                  href="https://ielts.org/test-centres"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#0E7C86]/10 border border-[#0E7C86]/40 text-[#0E7C86] dark:text-[#38C6D4] text-[9.5px] font-bold hover:border-[#0E7C86] transition-colors align-middle"
                >
                  <span>دليل مراكز IELTS</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>{' '}
                بحسب الدولة والمدينة ونوع الاختبار، ثم افتح صفحة المركز لمعرفة المواعيد والخدمات المتاحة. قد يختلف توفر Academic وGeneral وUKVI وLife Skills وOne Skill Retake وWriting on Paper من مركز إلى آخر. وقد تظهر حالات للمراكز مثل متاح أو غير متاح مؤقتًا أو مغلق؛ لذلك لا تعتمد على نتيجة بحث قديمة.
              </p>
            </div>
          </div>

          {/* 2. المواعيد والأسعار */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <CalendarCheck className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                المواعيد والأسعار
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 space-y-2 shadow-2xs overflow-hidden w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                </span>
                لا يوجد جدول عالمي واحد لمواعيد IELTS؛ فالسعة والمواعيد تختلفان حسب المركز ونوع الاختبار، وقد تُحدد جلسة Speaking بصورة منفصلة. كما لا يوجد رسم عالمي موحد؛ إذ تعتمد التكلفة على الدولة والمدينة والشريك والمركز والنسخة وطريقة التقديم والضرائب. ولخدمات إعادة المهارة أو المراجعة أو تغيير الموعد رسوم وشروط منفصلة.
              </p>

              <div className="pt-2 border-t border-[var(--mn-border)]/70">
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                  احرص على التحقق من السعر الإجمالي النهائي في شاشة الحجز، ولا تعتبر رسم مركز واحد سعرًا ثابتًا لكل الدولة، ولا تخلط بين رسوم IELTS العادي وUKVI وLife Skills.
                </p>
              </div>
            </div>
          </div>

          {/* 3. IELTS في اليمن */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Building2 className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                IELTS في اليمن
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 space-y-2 shadow-2xs overflow-hidden w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="relative inline-flex w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] items-center justify-center align-middle ml-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                </span>
                سجل ملف منارتك بتاريخ <strong className="text-[var(--mn-heading)]">2 أغسطس 2026</strong> المركز التالي بوصفه ظاهرًا في دليل IELTS الرسمي:
              </p>

              <div className="divide-y divide-[var(--mn-border)]/70 border-y border-[var(--mn-border)]/70 py-1">
                <div className="py-1.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-heading)]">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                    المركز:
                  </span>
                  <span dir="ltr" className="text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-heading)]">
                    British Council / New Horizons Yemen
                  </span>
                </div>
                <div className="py-1.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-heading)]">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                    المدينة:
                  </span>
                  <span className="text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)]">
                    عدن — خور مكسر
                  </span>
                </div>
                <div className="py-1.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-heading)]">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                    العنوان:
                  </span>
                  <span dir="ltr" className="text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)]">
                    Ba Hada Building — Fourth Floor
                  </span>
                </div>
              </div>

              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-block w-2 h-2 rounded-full bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-1.5 shrink-0" />
                والاختباران المدرجان هما IELTS Academic وIELTS General Training على الكمبيوتر. ووردت الرسوم التالية في الملف المرجعي، وتظهر القيم نفسها في صفحة المركز عند مراجعتها في{' '}
                <strong className="text-[var(--mn-heading)]">أكتوبر 2026</strong>، لكن قد تتغير لاحقًا وتخضع لضرائب محلية:
              </p>
            </div>

            {/* جدول رسوم مركز عدن */}
            <div className="-mx-2 sm:-mx-2.5 border-y border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden font-['Cairo',sans-serif]">
              <div className="grid grid-cols-12 bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)]">
                <div className="col-span-6 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white border-l border-white/15 flex items-center">
                  الاختبار في مركز عدن
                </div>
                <div className="col-span-6 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white flex items-center">
                  السعر المدرج
                </div>
              </div>

              <div className="divide-y divide-[var(--mn-border)]">
                {[
                  { label: 'Academic', value: '265 دولارًا أمريكيًا' },
                  { label: 'General Training', value: '265 دولارًا أمريكيًا' },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors"
                  >
                    <div dir="ltr" className="col-span-6 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center">
                      {row.label}
                    </div>
                    <div className="col-span-6 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[#0E7C86] dark:text-[#38C6D4] flex items-center">
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs overflow-hidden w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                لم يرد ضمن الملف توثيق لتوفر UKVI في المركز، كما ينبغي التحقق من خدمات One Skill Retake وWriting on Paper قبل الحجز. وقد يحتاج الطالب المقيم خارج عدن إلى السفر، وقد يلزم السفر إلى بلد آخر إذا كان مساره يتطلب مركز UKVI غير متاح محليًا.
              </p>
            </div>

            {/* التحقق النهائي — جوهرة نيلي */}
            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[#0E7C86] dark:bg-[#38C6D4]" />

              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                <strong className="text-[var(--mn-heading)]">التحقق النهائي:</strong> افتح{' '}
                <a
                  href="https://ielts.org/test-centres/british-council-new-horizons-yemen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#0E7C86]/10 border border-[#0E7C86]/40 text-[#0E7C86] dark:text-[#38C6D4] text-[9.5px] font-bold hover:border-[#0E7C86] transition-colors align-middle"
                >
                  <span>صفحة مركز عدن الرسمية</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>{' '}
                ثم ابدأ الحجز للتأكد من التوفر والسعر الحاليين. هذه المعلومات لا تؤكد وجود موعد متاح في تاريخ بعينه.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 11: 11. التسجيل والحجز والسياسات المالية                          */}
      {/* ========================================================================= */}
      <div
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mt-4 sm:mt-5 mn-panel"
        dir={publicDir}
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

        <DetailSectionHeader
          id="exam-registration-identity"
          icon={CalendarCheck}
          className="mb-3"
          title="11. التسجيل والحجز والسياسات المالية"
        />

        <div className="space-y-4 text-start w-full">
          {/* 1. خطوات التسجيل الرسمي — نقطة بترولي في مربع موحد اللون */}
          <div className="space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                خطوات التسجيل الرسمي
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 overflow-hidden shadow-2xs divide-y divide-[var(--mn-border)]/70 w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              {[
                { num: '1.', text: 'حدد الغرض من IELTS وافتح شروط الجامعة أو الهجرة أو الهيئة.' },
                { num: '2.', text: 'اختر النسخة الصحيحة: Academic أو General Training أو UKVI أو Life Skills.' },
                { num: '3.', text: 'اختر طريقة أداء مقبولة لدى الجهة المستقبلة.' },
                { num: '4.', text: 'ابحث عن مركز معتمد أو عن IELTS Online إذا كان متاحًا ومقبولًا لهدفك.' },
                { num: '5.', text: 'تحقق من الخدمات الإضافية التي قد تحتاجها، مثل One Skill Retake أو Writing on Paper.' },
                { num: '6.', text: 'اختر الموعد المناسب، وتأكد من موعد Speaking إذا عُيّن منفصلًا.' },
                { num: '7.', text: 'أدخل بياناتك واسمك مطابقين تمامًا لوثيقة الهوية.' },
                { num: '8.', text: 'قدم الوثيقة المطلوبة وسدد الرسم بالطريقة الرسمية.' },
                { num: '9.', text: 'احتفظ بتأكيد التسجيل والتعليمات وتحقق من استكمال أي ترتيبات خاصة.' },
              ].map((step) => (
                <div key={step.num} className="py-1.5 first:pt-0 last:pb-0 w-full">
                  <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. الهوية والعمر والبيانات الشخصية */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                الهوية والعمر والبيانات الشخصية
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 space-y-2 shadow-2xs overflow-hidden w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                </span>
                يجب أن تكون وثيقة الهوية أصلية وسارية ومن النوع المقبول لدى الجهة والمركز، وأن تُحضر الوثيقة نفسها المستخدمة عند التسجيل يوم الاختبار. قد يكون جواز السفر الخيار الأنسب عند الاختبار خارج بلد الجنسية، لكن القرار النهائي يعود لقواعد المركز. لا تؤجل تصحيح أي اختلاف في الاسم حتى يوم الاختبار.
              </p>

              <div className="pt-2 border-t border-[var(--mn-border)]/70 w-full">
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="relative inline-flex w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  لا يُنصح عادة بأداء IELTS لمن هم دون <strong className="text-[var(--mn-heading)]">16 عامًا</strong>، وقد يحتاج القاصر إلى موافقة بحسب البلد. ويشترط IELTS Online عمر{' '}
                  <strong className="text-[var(--mn-heading)]">18 عامًا فأكثر</strong>. تشمل بيانات التسجيل معلومات حساسة مثل أرقام الهوية والصور؛ لا تشاركها إلا عبر القنوات الرسمية المؤمّنة.
                </p>
              </div>
            </div>
          </div>

          {/* 3. تغيير الموعد والإلغاء والاسترداد */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <FileCheck className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                تغيير الموعد والإلغاء والاسترداد
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 space-y-2 shadow-2xs overflow-hidden w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                </span>
                قد تسمح سياسات الجهة المقدمة للاختبار بنقل الحجز أو إلغائه مع رسوم أو خصومات تختلف بحسب الدولة والشريك والنسخة وتوقيت الطلب. ووفق المعلومات الواردة في الملف المرجعي، تسمح بعض السياسات بنقل الموعد إلى تاريخ لا يتجاوز ثلاثة أشهر من التاريخ الأصلي، وقد تُقيد عدد مرات النقل. هذه ليست قاعدة مضمونة لكل حجز، فاقرأ الشروط المعروضة لك قبل الدفع.
              </p>

              <div className="pt-2 border-t border-[var(--mn-border)]/70 w-full">
                <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-heading)] leading-[1.8] text-justify">
                  <span className="relative inline-flex w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  ورد في ملف 2026 مثال لجدول استرداد خاص ببعض حجوزات IELTS for UKVI:
                </p>
              </div>
            </div>

            {/* جدول نسب الاسترداد */}
            <div className="-mx-2 sm:-mx-2.5 border-y border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden font-['Cairo',sans-serif]">
              <div className="grid grid-cols-12 bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)]">
                <div className="col-span-6 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white border-l border-white/15 flex items-center">
                  توقيت طلب الإلغاء
                </div>
                <div className="col-span-6 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white flex items-center">
                  نسبة الاسترداد الواردة في الملف
                </div>
              </div>

              <div className="divide-y divide-[var(--mn-border)]">
                {[
                  { timing: 'قبل أكثر من 14 يومًا', rate: '75%' },
                  { timing: 'من 14 يومًا إلى يومين', rate: '50%' },
                  { timing: 'خلال آخر يومين', rate: '25%' },
                  { timing: 'يوم الاختبار أو بعده', rate: 'لا استرداد' },
                ].map((row) => (
                  <div
                    key={row.timing}
                    className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors"
                  >
                    <div className="col-span-6 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center">
                      {row.timing}
                    </div>
                    <div className="col-span-6 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[#0E7C86] dark:text-[#38C6D4] flex items-center">
                      {row.rate}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ضوابط الجدول والاستثناءات — بدون مربع داخل مربع */}
            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 space-y-2 shadow-2xs overflow-hidden w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                <strong className="text-[var(--mn-heading)]">هذا الجدول مرجعي وليس سياسة مؤكدة لجميع الدول أو الحجوزات؛</strong> تحقّق من الشروط الحالية مع الجهة التي تستلم الرسوم. وذكر الملف إمكان فرض رسم إدارة لبعض تغييرات UKVI، إضافة إلى اختلاف سياسة IELTS Online، والتي تضمنت إرشادات للإلغاء قبل{' '}
                <strong className="text-[var(--mn-heading)]">72 ساعة</strong> في حالات معينة.
              </p>

              <div className="pt-2 border-t border-[var(--mn-border)]/70 w-full">
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="relative inline-flex w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  قد توجد استثناءات للمرض الخطير أو وفاة قريب أو ظرف قهري موثق، وتستلزم تقديم المستندات في الموعد المحدد. إذا احتجت تسهيلات خاصة للإعاقة أو حالة طبية، تواصل مع المركز قبل الحجز بمدة كافية بدل انتظار يوم الاختبار.
                </p>
              </div>
            </div>

            {/* تنبيه مراجعة الخمسة أشياء قبل الدفع — جوهرة نيلي */}
            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[#0E7C86] dark:bg-[#38C6D4]" />

              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                قبل إنهاء الدفع راجع <strong className="text-[var(--mn-heading)]">خمسة أشياء</strong>: النسخة، والطريقة، والمركز والموعد، والاسم والهوية، والسعر وسياسات التغيير والاسترداد. المعلومات النهائية للحجز هي المعلومات التي يؤكدها المركز الرسمي.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 12: 12. يوم الاختبار والتعليمات والتسهيلات                        */}
      {/* ========================================================================= */}
      <div
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mt-4 sm:mt-5 mn-panel"
        dir={publicDir}
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

        <DetailSectionHeader
          id="exam-day-rules-security"
          icon={ShieldAlert}
          className="mb-3"
          title="12. يوم الاختبار والتعليمات والتسهيلات"
        />

        <div className="space-y-4 text-start w-full">
          {/* 1. الاستعداد والحضور */}
          <div className="space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <CalendarCheck className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                الاستعداد والحضور
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 overflow-hidden shadow-2xs w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                </span>
                قبل يوم الاختبار راجع المكان والتاريخ والوقت وتأكيد الحجز، وتحقق مما إذا كان اختبار المحادثة في جلسة مختلفة. أحضر وثيقة الهوية الأصلية التي سجلت بها، واحضر في الوقت المحدد لإتمام إجراءات التحقق والأمن. قد يسمح المركز بالماء في عبوة شفافة بحسب تعليماته.
              </p>
            </div>
          </div>

          {/* 2. الممنوعات والالتزام بالقواعد */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldAlert className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                الممنوعات والالتزام بالقواعد
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 space-y-2 overflow-hidden shadow-2xs w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                يحظر عادةً استخدام الهاتف والساعة الذكية والقاموس والملاحظات والأجهزة الإلكترونية غير المصرح بها داخل قاعة الاختبار. لا تتواصل مع مرشحين آخرين أثناء الجلسة، ولا تُصور أو تنسخ أسئلة الاختبار أو تستخدم برامج أو أدوات ذكاء اصطناعي محظورة. أبلغ المشرف فورًا بأي عطل أو مشكلة أو ظرف طارئ بدل محاولة التعامل معه بوسيلة مخالفة.
              </p>

              <div className="pt-2 border-t border-[var(--mn-border)]/70 w-full">
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="relative inline-flex w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  تُؤدى Listening وReading وWriting في المركز غالبًا دون استراحة رسمية بين الأقسام. وفي Speaking أحضر الهوية، واتبع تعليمات الممتحن وتحدث بصورة طبيعية؛ المقابلة مسجلة لأغراض التقييم والنزاهة.
                </p>
              </div>
            </div>
          </div>

          {/* 3. التسهيلات الخاصة لذوي الإعاقة والحالات الطبية */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Heart className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                التسهيلات الخاصة لذوي الإعاقة والحالات الطبية
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 space-y-2 overflow-hidden shadow-2xs w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                </span>
                قد تتوفر ترتيبات معتمدة لمن لديهم حالات بصرية أو سمعية أو صعوبات تعلم أو مشكلات كلامية أو ظروف طبية موثقة. من أمثلتها وقت إضافي، وطباعة بخط كبير، ومواد Braille، ومكبر شاشة، وقاعة منفصلة، واستراحات، وتعديل وسائل الإجابة، ومساندة خاصة عند الموافقة. وقد تُعتمد إعفاءات محددة من مكون أو أكثر في حالات مؤهلة، مع استخدام إجراء رسمي لاحتساب الدرجة وذكر الملاحظة في التقرير.
              </p>

              <div className="pt-2 border-t border-[var(--mn-border)]/70 w-full">
                <p className="w-full text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-text)] leading-[1.8] text-justify">
                  <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                  بعض الترتيبات تحتاج إلى{' '}
                  <strong className="text-[var(--mn-heading)]">ستة أسابيع تقريبًا</strong>{' '}
                  للمعالجة، لذلك يجب تقديم الطلب مبكرًا مع المستندات المطلوبة. لا تفترض الموافقة التلقائية حتى يؤكدها المركز.
                </p>
              </div>
            </div>
          </div>

          {/* 4. الخصوصية والأمن والشكاوى */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                الخصوصية والأمن والشكاوى
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 overflow-hidden divide-y divide-[var(--mn-border)]/70 shadow-2xs w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <div className="pb-2 w-full">
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                  في IELTS Online تُسجل الجلسة بالصوت والصورة وفق سياسة النزاهة والخصوصية. وذكر ملف منارتك في{' '}
                  <strong className="text-[var(--mn-heading)]">أغسطس 2026</strong>{' '}
                  مدد احتفاظ مرجعية هي <strong className="text-[var(--mn-heading)]">60 يومًا</strong> لتسجيلات أقسام الاستماع والقراءة والكتابة، و
                  <strong className="text-[var(--mn-heading)]">3 أشهر</strong> لفيديو المحادثة، و
                  <strong className="text-[var(--mn-heading)]">3 سنوات</strong> لصوت المحادثة. راجع السياسة الحالية لأنها قد تتغير ولا تخلط بينها وبين مدة صلاحية نتيجة الاختبار.
                </p>
              </div>

              <div className="py-2 w-full">
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="relative inline-flex w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  قد تؤدي المخالفات الخطيرة مثل انتحال الهوية أو الغش أو التصوير إلى إيقاف الاختبار أو إلغاء النتيجة أو التحقيق أو عقوبات أخرى وفق السياسة المعمول بها.
                </p>
              </div>

              <div className="pt-2 w-full">
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                  إذا واجهت مشكلة في ظروف الاختبار أو الخدمة، ابدأ بمركز الاختبار واحتفظ بالتفاصيل والمستندات، ثم استخدم قنوات الشكاوى الرسمية عند عدم الحل. وتختلف الشكوى عن الخدمة عن EOR لمراجعة الدرجة وعن طلب النظر في ظرف استثنائي أثّر على الأداء. تذكر وثائق الملف مددًا إجرائية لبعض الشكاوى، لكن المواعيد المعتمدة هي الواردة في سياسة الجهة الحالية.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 13: 13. نتائج الاختبار والشهادات والتحقق منها                      */}
      {/* ========================================================================= */}
      <div
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mt-4 sm:mt-5 mn-panel"
        dir={publicDir}
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

        <DetailSectionHeader
          id="exam-results-certificates"
          icon={FileCheck}
          className="mb-3"
          title="13. نتائج الاختبار والشهادات والتحقق منها"
        />

        <div className="space-y-4 text-start w-full">
          {/* 1. متى تظهر نتائج IELTS؟ */}
          <div className="space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                متى تظهر نتائج IELTS؟
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 overflow-hidden shadow-2xs w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                </span>
                تختلف مدة النتائج حسب النوع وطريقة التقديم، وقد تُؤخَّر أحيانًا بسبب فحوص التحقق. يعرض ملف منارتك الفترات المرجعية التالية:
              </p>
            </div>

            {/* جدول مدد النتائج */}
            <div className="-mx-2 sm:-mx-2.5 border-y border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden font-['Cairo',sans-serif]">
              <div className="grid grid-cols-12 bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)]">
                <div className="col-span-7 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white border-l border-white/15 flex items-center">
                  الاختبار أو طريقة التقديم
                </div>
                <div className="col-span-5 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white flex items-center">
                  المدة التقريبية للنتيجة
                </div>
              </div>

              <div className="divide-y divide-[var(--mn-border)]">
                {[
                  { method: 'IELTS on Computer', duration: '1–5 أيام؛ وغالبًا 1–2 يوم' },
                  { method: 'IELTS on Computer مع Writing on Paper', duration: 'خلال خمسة أيام' },
                  { method: 'IELTS on Paper التقليدي', duration: 'حتى 13 يومًا' },
                  { method: 'IELTS Online Academic', duration: '6–8 أيام' },
                  { method: 'IELTS for UKVI بأربع مهارات', duration: '1–5 أيام وفق الملف' },
                  { method: 'UKVI Life Skills', duration: 'حتى سبعة أيام وفق الملف' },
                  { method: 'One Skill Retake', duration: '3–5 أيام' },
                ].map((item) => (
                  <div
                    key={item.method}
                    className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors"
                  >
                    <div className="col-span-7 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center">
                      {item.method}
                    </div>
                    <div className="col-span-5 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[#0E7C86] dark:text-[#38C6D4] flex items-center">
                      {item.duration}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ملاحظة هامش التأخير — جوهرة نيلي */}
            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[#0E7C86] dark:bg-[#38C6D4]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                ستوضح الجهة التي حجزت معها طريقة الاطلاع على النتيجة، وقد يصلك بريد إلكتروني عند توفرها. لا تعتمد على المدة التقريبية إذا كان لديك موعد نهائي حاسم لتقديم منحة أو تأشيرة؛ اترك هامشًا لاحتمال التأخير.
              </p>
            </div>
          </div>

          {/* 2. ما تقرير Test Report Form (TRF)؟ */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <FileCheck className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                ما تقرير Test Report Form (TRF)؟
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 space-y-2 overflow-hidden shadow-2xs w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                </span>
                TRF هو تقرير IELTS الرسمي للنتائج، ويتضمن بيانات المتقدم، ونوع الاختبار، والتاريخ والمركز، ودرجات المهارات الأربع، والـOverall، ومعلومات التحقق من التقرير. أما eTRF فهو التقرير الإلكتروني، ويمكن مشاركته عبر القنوات الرسمية مع المؤسسات التي تقبل هذه الطريقة. يوفر IELTS Online عادة التقرير الإلكتروني فقط، ولا يصدر تقريرًا ورقيًا لهذا المسار وفق صفحته الرسمية.
              </p>

              <div className="pt-2 border-t border-[var(--mn-border)]/70 w-full">
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="relative inline-flex w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  <strong className="text-[var(--mn-heading)]">مشاركة النتائج:</strong> يمكنك طلب إرسال التقرير إلى الجامعات أو الهيئات عبر الوسائل المعتمدة، ويمكن للمؤسسات استخدام IELTS Results Service للتحقق من صحة بيانات الاختبار والدرجات وحالة التقرير، بما في ذلك بيان إعادة المهارة إن وجدت.
                </p>
              </div>
            </div>
          </div>

          {/* 3. صلاحية النتيجة وتحديث شكل الشهادة */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Award className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                صلاحية النتيجة وتحديث شكل الشهادة
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 space-y-2 overflow-hidden shadow-2xs w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                توصي IELTS عادة بالاعتماد على النتائج خلال <strong className="text-[var(--mn-heading)]">سنتين</strong> من تاريخ الاختبار، مع وجود جهات قد تطبق قواعد مختلفة لحداثة النتائج. لا تفترض أن نتيجة أقدم مقبولة حتى تؤكد المؤسسة ذلك.
              </p>

              <div className="pt-2 border-t border-[var(--mn-border)]/70 w-full">
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="relative inline-flex w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  تغير تصميم TRF في <strong className="text-[var(--mn-heading)]">15 يوليو 2026</strong> بإضافة شعار Ofqual واسم المؤهل المنظم. يوضح ملف منارتك أن التقارير القديمة والجديدة تظل صالحة، وأن تغيير الشكل لا يمدد مدة صلاحية النتيجة. ووردت خدمة تحديث التصميم لبعض التقارير التي صدرت بين{' '}
                  <strong className="text-[var(--mn-heading)]">يونيو 2024</strong> و
                  <strong className="text-[var(--mn-heading)]">14 يوليو 2026</strong>؛ راجع الشروط الرسمية قبل طلب إصدار جديد.
                </p>
              </div>
            </div>

            {/* حماية الخصوصية — جوهرة نيلي */}
            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[#0E7C86] dark:bg-[#38C6D4]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                <strong className="text-[var(--mn-heading)]">حماية الخصوصية:</strong> لا تنشر رقم TRF علنًا ولا تنسخ جواز سفرك إلى مواقع مجهولة. احتفظ بالنتيجة في مكان آمن وشاركها بإذنك عبر القنوات الرسمية فقط.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 14: 14. إعادة الاختبار ومراجعة الدرجات                            */}
      {/* ========================================================================= */}
      <div
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mt-4 sm:mt-5 mn-panel"
        dir={publicDir}
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

        <DetailSectionHeader
          id="exam-retake-remarks"
          icon={Layers}
          className="mb-3"
          title="14. إعادة الاختبار ومراجعة الدرجات"
        />

        <div className="space-y-4 text-start w-full">
          {/* الجملة الافتتاحية */}
          <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
            <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
            <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <span className="inline-block w-2 h-2 rounded-full bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-1.5 shrink-0" />
              إذا لم تحقق الدرجة المطلوبة، فتوجد خيارات مختلفة، ومن المهم التمييز بين إعادة الأداء ومراجعة التقييم.
            </p>
          </div>

          {/* 1. إعادة الاختبار كاملًا */}
          <div className="space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                إعادة الاختبار كاملًا
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 overflow-hidden shadow-2xs w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                </span>
                يمكن حجز اختبار IELTS كامل مرة أخرى بعد دفع الرسوم الجديدة. لا يوجد حد عالمي عام لعدد المحاولات، لكن تخضع الحجوزات للتوفر وسياسات الجهة. قد يكون هذا الخيار أنسب إذا احتجت إلى تحسين أكثر من مهارة أو لا تتوافر لديك أهلية إعادة مهارة واحدة.
              </p>
            </div>
          </div>

          {/* 2. One Skill Retake — إعادة مهارة واحدة */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                One Skill Retake — إعادة مهارة واحدة
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 overflow-hidden divide-y divide-[var(--mn-border)]/70 shadow-2xs w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <div className="pb-2 w-full">
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  تتيح هذه الخدمة إعادة Listening أو Reading أو Writing أو Speaking فقط بعد اختبار أصلي مؤهل على الكمبيوتر في مركز يدعمها. يجب إكمال إعادة المهارة خلال{' '}
                  <strong className="text-[var(--mn-heading)]">60 يومًا</strong>{' '}
                  من موعد الاختبار الأصلي، وهي إعادة واحدة فقط لكل اختبار أصلي. الخدمة متوفرة في دول ومراكز عديدة، لكن لا يجوز افتراض توفرها في كل مركز.
                </p>
              </div>

              <div className="py-2 w-full">
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="relative inline-flex w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] items-center justify-center align-middle ml-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                  </span>
                  تصدر بعد الإعادة TRF جديدة تضم الدرجة المعادة ودرجات المهارات الثلاث الأصلية، مع إعادة حساب Overall، ويبقى التقرير الأصلي متاحًا. تظهر النتيجة عادة خلال{' '}
                  <strong className="text-[var(--mn-heading)]">3–5 أيام</strong>، وتختلف رسوم الخدمة بحسب المركز. إذا كان اختبار الكتابة الأصلي بنمط Writing on Paper، فيلزم عند إعادة هذه المهارة استخدام نمط الكتابة نفسه.
                </p>
              </div>

              <div className="pt-2 w-full">
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                  <strong className="text-[var(--mn-heading)]">القبول ليس تلقائيًا:</strong> لا تقبل كل جامعة أو هيئة أو حكومة One Skill Retake، رغم وجود قبول لها في بعض المسارات؛ تحقق من شروط الجهة المستقبلة قبل دفع رسوم الإعادة، بما في ذلك شروط UKVI إن كانت حالتك مرتبطة بتأشيرة بريطانية.
                </p>
              </div>
            </div>
          </div>

          {/* 3. Enquiry on Results (EOR) — مراجعة الدرجة */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <FileCheck className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                Enquiry on Results (EOR) — مراجعة الدرجة
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 overflow-hidden shadow-2xs w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                </span>
                EOR ليست اختبارًا جديدًا؛ إنها طلب لإعادة تقييم الإجابات الأصلية في مهارة أو أكثر. يذكر الملف أن المهلة الشائعة لتقديم طلب المراجعة هي{' '}
                <strong className="text-[var(--mn-heading)]">ستة أسابيع من الاختبار</strong>، وأن الرسوم يحددها المركز وتُسترد عادة إذا تغيرت درجة Band في أحد الأقسام التي تمت مراجعتها. وقد تستغرق عملية المراجعة حتى{' '}
                <strong className="text-[var(--mn-heading)]">21 يومًا</strong>{' '}
                بحسب بعض إرشادات الشركاء. تصدر نتيجة أو TRF محدثة إذا تغيرت الدرجة.
              </p>
            </div>
          </div>

          {/* 4. ما الخيار الأنسب؟ */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Compass className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                ما الخيار الأنسب؟
              </h3>
            </div>

            {/* جدول مقارنة خيارات الإعادة والمراجعة */}
            <div className="-mx-2 sm:-mx-2.5 border-y border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden font-['Cairo',sans-serif]">
              <div className="grid grid-cols-12 bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)]">
                <div className="col-span-3 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white border-l border-white/15 flex items-center">
                  الإجراء
                </div>
                <div className="col-span-4 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white border-l border-white/15 flex items-center">
                  ماذا تفعل؟
                </div>
                <div className="col-span-5 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white flex items-center">
                  متى تفكر فيه؟
                </div>
              </div>

              <div className="divide-y divide-[var(--mn-border)]">
                {[
                  {
                    action: 'إعادة الاختبار كاملًا',
                    what: 'تؤدي المهارات كلها مجددًا',
                    when: 'عندما تحتاج رفع أكثر من مهارة أو تفتقد أهلية OSR',
                  },
                  {
                    action: 'One Skill Retake',
                    what: 'تعيد مهارة واحدة فقط',
                    when: 'عندما تكون مهارة واحدة هي العائق والجهة تقبل الإعادة',
                  },
                  {
                    action: 'EOR',
                    what: 'تطلب إعادة تقييم الإجابات القديمة',
                    when: 'عندما ترى أن النتيجة تستحق مراجعة رسمية',
                  },
                ].map((row) => (
                  <div
                    key={row.action}
                    className="grid grid-cols-12 items-stretch odd:bg-[var(--mn-surface)] even:bg-[var(--mn-page)] hover:bg-[var(--mn-surface-muted)]/50 transition-colors"
                  >
                    <div className="col-span-3 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center leading-snug">
                      {row.action}
                    </div>
                    <div className="col-span-4 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[#0E7C86] dark:text-[#38C6D4] border-l border-[var(--mn-border)] flex items-center leading-snug">
                      {row.what}
                    </div>
                    <div className="col-span-5 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] flex items-center leading-snug">
                      {row.when}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* نصيحة القرار + رابط OSR الرسمي — جوهرة نيلي */}
            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[#0E7C86] dark:bg-[#38C6D4]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                لا تتخذ القرار اعتمادًا على الدرجة وحدها؛ ضع في الحسبان الموعد النهائي للتقديم، ورسوم الإجراء، ومدته، وسياسة الجهة المستقبلة. مرجع OSR الرسمي:{' '}
                <a
                  href="https://ielts.org/take-a-test/booking-your-test/one-skill-retake"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-[#0E7C86]/10 border border-[#0E7C86]/40 px-1.5 py-0.5 text-[10px] font-bold text-[#0E7C86] dark:text-[#38C6D4] hover:border-[#0E7C86] transition-colors align-middle"
                >
                  <span>IELTS One Skill Retake</span>
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 15: 15. الأسئلة الشائعة والاختبارات البديلة                        */}
      {/* ========================================================================= */}
      <div
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mt-4 sm:mt-5 mn-panel"
        dir={publicDir}
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

        <DetailSectionHeader
          id="exam-faqs-alternatives"
          icon={HelpCircle}
          className="mb-3"
          title="15. الأسئلة الشائعة والاختبارات البديلة"
        />

        <div className="space-y-4 text-start w-full">
          {/* 1. أكثر الاستفسارات شيوعًا — نظام Accordion تفاعلي */}
          <div className="space-y-2.5 w-full">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                  <HelpCircle className="w-3.5 h-3.5 text-white" />
                </span>
                <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                  أكثر الاستفسارات شيوعًا
                </h3>
              </div>
              <span className="text-[9.5px] font-bold text-[#0E7C86] dark:text-[#38C6D4]">
                اضغط على السؤال لعرض الإجابة
              </span>
            </div>

            <div className="space-y-2 w-full">
              {[
                {
                  q: 'هل IELTS Academic مناسب للدراسة الجامعية؟',
                  a: 'نعم، غالبًا، ولكن يجب التأكد من متطلبات الجامعة والبرنامج.',
                },
                {
                  q: 'هل يكفي Overall 6.5 لكل جامعة؟',
                  a: 'لا؛ فقد تختلف الدرجة الإجمالية وحدود المهارات والنسخة المقبولة.',
                },
                {
                  q: 'ما الفرق بين Academic وGeneral؟',
                  a: 'تختلف مهام القراءة والكتابة، بينما يتطابق الاستماع والمحادثة.',
                },
                {
                  q: 'هل يمكن أداء IELTS من المنزل؟',
                  a: 'نعم، عبر IELTS Online Academic في المناطق المدعومة، مع شروط عمر وجهاز ومراقبة، ولكن ليس للهجرة أو التسجيل المهني.',
                },
                {
                  q: 'هل يمكن أداء IELTS for UKVI من المنزل؟',
                  a: 'لا إذا كان المسار يتطلب اختبار UKVI SELT معتمدًا داخل مركز.',
                },
                {
                  q: 'هل توقف الاختبار الورقي؟',
                  a: 'أعلنت IELTS في مارس 2026 الانتقال التدريجي إلى الكمبيوتر بدءًا من منتصف 2026، مع اختلاف التنفيذ بين الأسواق.',
                },
                {
                  q: 'هل Writing on Paper هو الاختبار الورقي القديم؟',
                  a: 'لا؛ إنه اختبار على الكمبيوتر تُكتب فيه مهمة Writing بالقلم، ولا يُذكر هذا الاختيار في تقرير النتيجة وفق الإعلان الرسمي.',
                },
                {
                  q: 'هل يسمح بالقاموس أو الهاتف؟',
                  a: 'لا داخل جلسة الاختبار.',
                },
                {
                  q: 'هل توجد نقاط سالبة في Listening وReading؟',
                  a: 'لا؛ تُحتسب الإجابات الصحيحة فقط.',
                },
                {
                  q: 'هل الدرجة صالحة مدى الحياة؟',
                  a: 'لا؛ الاستخدام المعتاد موصى به لمدة سنتين، والقرار النهائي للمؤسسة.',
                },
                {
                  q: 'هل يمكن إعادة مهارة واحدة؟',
                  a: 'نعم، عند تحقق شروط One Skill Retake، ولكن يجب التأكد من قبول الجهة المستقبلة.',
                },
                {
                  q: 'هل EOR إعادة اختبار؟',
                  a: 'لا؛ هي إعادة مراجعة الإجابات الأصلية.',
                },
                {
                  q: 'هل كل مركز في اليمن يقدم UKVI؟',
                  a: 'لا يصح افتراض ذلك؛ تحقق من تصنيف المركز والاختبار عند الحجز.',
                },
              ].map((faq, idx) => {
                const isOpen = openFaqIndices.includes(idx);
                return (
                  <div
                    key={faq.q}
                    className={`rounded-xl border transition-colors overflow-hidden shadow-2xs w-full bg-[var(--mn-page)] ${
                      isOpen
                        ? 'border-[#0E7C86]/60'
                        : 'border-[var(--mn-border)] hover:border-[#0E7C86]/40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaqItem(idx)}
                      aria-expanded={isOpen}
                      className="w-full px-3 py-2.5 flex items-center justify-between gap-2.5 text-start cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* زاوية هندسية قبل كل سؤال */}
                        <span className="relative w-3.5 h-3.5 border-t-[2px] border-r-[2px] border-[#142B5F] dark:border-[#F2CD78] rounded-tr-[3px] flex items-center justify-center shrink-0">
                          <span className="w-1.5 h-1.5 bg-[#142B5F] dark:bg-[#F2CD78]" />
                        </span>
                        <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-heading)] leading-snug">
                          {faq.q}
                        </span>
                      </div>
                      <span
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-transform duration-200 ${
                          isOpen
                            ? 'bg-[#0E7C86] border-[#142B5F] text-white rotate-180'
                            : 'bg-[var(--mn-surface)] border-[var(--mn-border)] text-[#0E7C86] dark:text-[#38C6D4]'
                        }`}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-3 pb-3 pt-2 border-t border-[var(--mn-border)]/70 w-full">
                        <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                          {/* نقطة بترولي للإجابة */}
                          <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                          {faq.a}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. الاختبارات التي قد تكون بدائل عن IELTS */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Languages className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                الاختبارات التي قد تكون بدائل عن IELTS
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 overflow-hidden shadow-2xs w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.9] text-justify">
                <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#142B5F]/12 dark:bg-[#F2CD78]/15 border-[1.5px] border-[#0E7C86] dark:border-[#38C6D4] items-center justify-center align-middle ml-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#142B5F] dark:bg-[#F2CD78]" />
                </span>
                قد تقبل بعض الجامعات والمؤسسات اختبارات أخرى، منها{' '}
                <strong className="text-[var(--mn-heading)]">TOEFL iBT</strong>، و
                <strong className="text-[var(--mn-heading)]">PTE Academic</strong>، و
                <strong className="text-[var(--mn-heading)]">Duolingo English Test</strong>، و
                <strong className="text-[var(--mn-heading)]">Cambridge C1 Advanced</strong>، و
                <strong className="text-[var(--mn-heading)]">Cambridge C2 Proficiency</strong>، و
                <strong className="text-[var(--mn-heading)]">Linguaskill</strong>، و
                <strong className="text-[var(--mn-heading)]">Oxford Test of English</strong>، و
                <strong className="text-[var(--mn-heading)]">LanguageCert Academic</strong>. تختلف طريقة الأداء والدرجات والرسوم والمراكز والقبول المؤسسي بين هذه الاختبارات.
              </p>
            </div>

            {/* قاعدة اختيار البديل — جوهرة نيلي */}
            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[#0E7C86] dark:bg-[#38C6D4]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                قبل اختيار بديل، تحقق من قائمة الاختبارات المقبولة لدى جهتك، والدرجة المطلوبة، وطريقة التقديم المتاحة في بلدك، وتكلفة الاختبار، وسرعة النتائج، ومدة القبول، وسياسة الإعادة. الاختبار الأفضل لك هو الذي يستوفي متطلبات الجهة ويوافق ظروفك، لا الذي يحمل الاسم الأكثر شهرة.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 16: 16. المصادر الرسمية وآخر التحديثات                             */}
      {/* ========================================================================= */}
      <div
        className="relative w-full bg-[var(--mn-surface)] rounded-none md:rounded-2xl px-2 sm:px-2.5 md:px-6 py-3.5 sm:py-4 md:py-6 border-y md:border border-[var(--mn-border-brand)] shadow-md shadow-[var(--mn-shadow-ink)]/60 overflow-hidden mt-4 sm:mt-5 mn-panel"
        dir={publicDir}
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[var(--mn-section-line)] to-transparent z-10" />

        <DetailSectionHeader
          id="exam-official-sources-updates"
          icon={Globe}
          className="mb-3"
          title="16. المصادر الرسمية وآخر التحديثات"
        />

        <div className="space-y-4 text-start w-full">
          {/* الجملة الافتتاحية */}
          <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
            <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
            <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
              <span className="inline-block w-2 h-2 rounded-full bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-1.5 shrink-0" />
              هذه روابط رسمية للرجوع إلى المعلومات التفصيلية وللتأكد من آخر تحديث قبل الحجز:
            </p>
          </div>

          {/* 1. الموقع الرسمي والأنواع — نقطة بترولي موحدة */}
          <div className="space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Globe className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                الموقع الرسمي والأنواع
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full">
              {[
                { label: 'موقع IELTS الرسمي', url: 'https://ielts.org/' },
                { label: 'أنواع اختبار IELTS', url: 'https://ielts.org/take-a-test/test-types' },
                { label: 'IELTS Academic', url: 'https://ielts.org/take-a-test/test-types/ielts-academic-test' },
                { label: 'IELTS General Training', url: 'https://ielts.org/take-a-test/test-types/ielts-general-training-test' },
                { label: 'IELTS for UKVI', url: 'https://ielts.org/take-a-test/test-types/ielts-tests-for-uk-visas-and-immigration' },
                { label: 'IELTS for UKVI Life Skills', url: 'https://ielts.org/take-a-test/test-types/ielts-tests-for-uk-visas-and-immigration/ielts-life-skills-test' },
                { label: 'IELTS Online Academic', url: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-online' },
                { label: 'متطلبات التأشيرات البريطانية SELT من GOV.UK', url: 'https://www.gov.uk/guidance/prove-your-english-language-abilities-with-a-secure-english-language-test-selt' },
              ].map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86] p-2.5 flex items-center justify-between gap-2 shadow-2xs transition-colors overflow-hidden group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] shrink-0" />
                    <span className="text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-heading)] truncate">
                      {link.label}
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#38C6D4] shrink-0" />
                </a>
              ))}
            </div>
          </div>

          {/* 2. الأقسام والدرجات — نقطة بترولي موحدة */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <BarChart3 className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                الأقسام والدرجات
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full">
              {[
                { label: 'Listening', url: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-listening' },
                { label: 'Academic Reading', url: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading' },
                { label: 'Academic Writing', url: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-writing' },
                { label: 'Speaking', url: 'https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking' },
                { label: 'General Training Reading', url: 'https://ielts.org/take-a-test/test-types/ielts-general-training-test/ielts-general-training-format-reading' },
                { label: 'General Training Writing', url: 'https://ielts.org/take-a-test/test-types/ielts-general-training-test/ielts-general-training-format-writing' },
                { label: 'نظام درجات IELTS', url: 'https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail' },
                { label: 'الحصول على النتائج ومشاركتها', url: 'https://ielts.org/take-a-test/your-results/getting-and-sharing-your-results' },
              ].map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86] p-2.5 flex items-center justify-between gap-2 shadow-2xs transition-colors overflow-hidden group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] shrink-0" />
                    <span className="text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-heading)] truncate">
                      {link.label}
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#38C6D4] shrink-0" />
                </a>
              ))}
            </div>
          </div>

          {/* 3. الحجز والنتائج والتحضير — نقطة بترولي موحدة */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <CalendarCheck className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                الحجز والنتائج والتحضير
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full">
              {[
                { label: 'البحث عن مراكز IELTS', url: 'https://ielts.org/test-centres' },
                { label: 'مركز British Council / New Horizons في عدن', url: 'https://ielts.org/test-centres/british-council-new-horizons-yemen' },
                { label: 'One Skill Retake', url: 'https://ielts.org/take-a-test/booking-your-test/one-skill-retake' },
                { label: 'سياسات الإلغاء والاسترداد والمراجعة ونقل الموعد', url: 'https://ielts.org/take-a-test/booking-your-test/cancellations-refunds-remarks-transfers' },
                { label: 'نماذج ومصادر التحضير الرسمية', url: 'https://ielts.org/take-a-test/preparation-resources/sample-test-questions' },
              ].map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] hover:border-[#0E7C86] p-2.5 flex items-center justify-between gap-2 shadow-2xs transition-colors overflow-hidden group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] shrink-0" />
                    <span className="text-[10px] sm:text-[10.5px] font-bold text-[var(--mn-heading)] truncate">
                      {link.label}
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-[#0E7C86] dark:text-[#38C6D4] shrink-0" />
                </a>
              ))}
            </div>
          </div>

          {/* 4. أبرز تحديثات 2026 */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <Info className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                أبرز تحديثات 2026
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 overflow-hidden divide-y divide-[var(--mn-border)]/70 shadow-2xs w-full">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[linear-gradient(180deg,#0E7C86_0%,#0E7C86_75%,#142B5F_100%)]" />
              <div className="pb-2 w-full">
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                  <strong className="text-[var(--mn-heading)]">انتقال الاختبار الورقي إلى الكمبيوتر:</strong> في{' '}
                  <strong className="text-[var(--mn-heading)]">5 مارس 2026</strong>{' '}
                  أعلنت IELTS وقف تقديم الاختبار الورقي المستقل تدريجيًا من{' '}
                  <strong className="text-[var(--mn-heading)]">منتصف 2026</strong>، مع اختلاف التنفيذ بين الأسواق. ويُقدَّم خيار Writing on Paper في دول مختارة دون تغيير المهارات أو أسس التقييم.{' '}
                  <a
                    href="https://ielts.org/news-and-insights/updates-to-ielts-test-delivery"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-[#0E7C86]/10 border border-[#0E7C86]/40 px-1.5 py-0.5 text-[10px] font-bold text-[#0E7C86] dark:text-[#38C6D4] hover:border-[#0E7C86] transition-colors align-middle"
                  >
                    <span>الإعلان الرسمي</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </a>
                  .
                </p>
              </div>

              <div className="py-2 w-full">
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                  <strong className="text-[var(--mn-heading)]">تحديث تقرير النتيجة:</strong> بدأ تغيير تصميم Test Report Form في{' '}
                  <strong className="text-[var(--mn-heading)]">15 يوليو 2026</strong>، مع استمرار صلاحية التقارير القديمة.{' '}
                  <a
                    href="https://ielts.org/news-and-insights/changes-to-test-report-forms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-[#0E7C86]/10 border border-[#0E7C86]/40 px-1.5 py-0.5 text-[10px] font-bold text-[#0E7C86] dark:text-[#38C6D4] hover:border-[#0E7C86] transition-colors align-middle"
                  >
                    <span>تفاصيل تحديث التقرير</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </a>
                  .
                </p>
              </div>

              <div className="pt-2 w-full">
                <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#0E7C86] dark:bg-[#38C6D4] align-middle ml-1.5 shrink-0" />
                  <strong className="text-[var(--mn-heading)]">إعادة مهارة واحدة:</strong> تسمح One Skill Retake للمرشح المؤهل بإعادة مهارة واحدة خلال{' '}
                  <strong className="text-[var(--mn-heading)]">60 يومًا</strong>{' '}
                  من الاختبار الأصلي لدى مركز مدعوم، مع ضرورة التحقق من قبول المؤسسة.{' '}
                  <a
                    href="https://ielts.org/take-a-test/booking-your-test/one-skill-retake"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-[#0E7C86]/10 border border-[#0E7C86]/40 px-1.5 py-0.5 text-[10px] font-bold text-[#0E7C86] dark:text-[#38C6D4] hover:border-[#0E7C86] transition-colors align-middle"
                  >
                    <span>السياسة الرسمية</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>

          {/* 5. قبل أن تسجل + جدول التوثيق الختامي */}
          <div className="pt-3 border-t border-[var(--mn-border)] space-y-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#142B5F] border-[1.5px] border-[#142B5F] ring-1 ring-[#142B5F]/40 text-white mn-sub-item-icon flex items-center justify-center shrink-0 shadow-2xs">
                <FileText className="w-3.5 h-3.5 text-white" />
              </span>
              <h3 className="text-[11.5px] sm:text-[12px] font-bold text-[var(--mn-heading)]">
                قبل أن تسجل
              </h3>
            </div>

            <div className="relative rounded-xl bg-[var(--mn-page)] border border-[var(--mn-border)] p-3 pr-4 shadow-2xs w-full overflow-hidden">
              <span className="pointer-events-none absolute top-2.5 bottom-2.5 right-0 w-[3.5px] rounded-l-full bg-[#0E7C86] dark:bg-[#38C6D4]" />
              <p className="w-full text-[10.5px] sm:text-[11px] font-bold text-[var(--mn-text)] leading-[1.85] text-justify">
                <span className="inline-block w-2.5 h-2.5 rotate-45 rounded-[2px] bg-[#142B5F] dark:bg-[#F2CD78] align-middle ml-2 shrink-0" />
                تأكد من النسخة الصحيحة، والدرجة الإجمالية وحد كل مهارة، وطريقة التقديم المقبولة، والمركز والسعر والموعد، وصلاحية النتيجة لدى الجهة التي ستقدم إليها. تذكر أن أسعار المراكز والمقاعد وشروط التأشيرات وقبول الجامعات متغيرة؛ فالموقع الرسمي للجهة المستقبلة ونظام الحجز هما المرجع النهائي.
              </p>
            </div>

            {/* جدول التوثيق المرجعي الختامي */}
            <div className="-mx-2 sm:-mx-2.5 border-y border-[var(--mn-border)] bg-[var(--mn-surface)] overflow-hidden font-['Cairo',sans-serif]">
              <div className="grid grid-cols-12 bg-gradient-to-l from-[#153B75] to-[#056579] border-b border-[var(--mn-border)]">
                <div className="col-span-6 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white border-l border-white/15 flex items-center">
                  البند التوثيقي
                </div>
                <div className="col-span-6 py-2.5 px-2.5 sm:px-3.5 text-[10.5px] sm:text-[11.5px] font-bold text-white flex items-center">
                  التفاصيل المعتمدة
                </div>
              </div>

              <div className="divide-y divide-[var(--mn-border)]">
                <div className="grid grid-cols-12 items-stretch bg-[var(--mn-surface)]">
                  <div className="col-span-6 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center">
                    الملف المرجعي الأصلي
                  </div>
                  <div className="col-span-6 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[#0E7C86] dark:text-[#38C6D4] flex items-center">
                    IELTS_2026_Complete_Data_AR.md — مستودع منارتك
                  </div>
                </div>

                <div className="grid grid-cols-12 items-stretch bg-[var(--mn-page)]">
                  <div className="col-span-6 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center">
                    آخر تحقق شامل مدوّن في الملف الأصلي
                  </div>
                  <div className="col-span-6 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] flex items-center">
                    2 أغسطس 2026
                  </div>
                </div>

                <div className="grid grid-cols-12 items-stretch bg-[var(--mn-surface)]">
                  <div className="col-span-6 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-heading)] border-l border-[var(--mn-border)] flex items-center">
                    مراجعة انتقائية لبعض المصادر الرسمية
                  </div>
                  <div className="col-span-6 py-2.5 px-2.5 sm:px-3.5 text-[10px] sm:text-[11px] font-bold text-[var(--mn-text)] flex items-center">
                    31 أكتوبر 2026
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Notification Toast */}
      {saveToast && (
        <div className="fixed bottom-6 inset-x-4 max-w-xs mx-auto bg-[var(--mn-primary)] text-white px-4 py-2 rounded-full shadow-2xl z-50 flex items-center justify-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 mn-inverse">
          <Check className="w-3.5 h-3.5 text-[var(--mn-accent-text)]" />
          <span>
            {isFavorite
              ? publicT('public_added_to_favorites') || 'تمت إضافة الاختبار إلى المفضلة'
              : publicT('public_removed_from_favorites') || 'تمت إزالة الاختبار من المفضلة'}
          </span>
        </div>
      )}
    </div>
  );
};
