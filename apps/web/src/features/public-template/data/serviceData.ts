import { Service } from '../types';

export const PUBLIC_SERVICES: Service[] = [
  {
    id: 'service-university-major-consultation',
    slug: 'university-major-consultation',
    title: 'استشارة اختيار الجامعة والتخصص المناسب',
    audience: 'student',
    category: 'اختيار الجامعة والتخصص',
    badge: 'خدمة طلابية',
    shortDescription:
      'جلسة إرشادية تساعدك على تضييق الخيارات وبناء قائمة جامعات وتخصصات تناسب ملفك الأكاديمي وأهدافك.',
    description:
      'نراجع خلفيتك الأكاديمية واهتماماتك والدول والتخصصات التي تفكر فيها، ثم نساعدك على تنظيم معايير الاختيار وبناء خيارات واقعية قابلة للمقارنة.',
    priceLabel: '$49 / جلسة',
    turnaround: '24–48 ساعة',
    deliveryMode: 'جلسة فردية عن بُعد',
    includes: [
      'مراجعة الملف الأكاديمي والهدف الدراسي.',
      'تحليل الدول والتخصصات التي يفضلها الطالب.',
      'بناء معايير واضحة للمقارنة بين الجامعات والتخصصات.',
    ],
    excludes: [
      'لا تتضمن تقديم طلب قبول جامعي نيابة عن الطالب.',
    ],
    requirements: [
      'المرحلة أو المؤهل الدراسي الحالي.',
    ],
    packages: [],
    faqs: [],
    cancellationPolicy: '',
    requestContextFields: [],
    contextualLinks: [],
  },
  {
    id: 'service-statement-of-purpose-review',
    slug: 'statement-of-purpose-review',
    title: 'مراجعة وتدقيق السيرة الذاتية وخطاب الدافع',
    audience: 'student',
    category: 'تجهيز ملف القبول',
    badge: 'خدمة طلابية',
    shortDescription:
      'تدقيق احترافي لخطاب الغرض من الدراسة والسيرة الذاتية الأكاديمية لضمان استيفاء معايير الجامعات العالمية.',
    description:
      'نساعدك على صياغة وتنقيح الوثائق الأكاديمية الشخصية مع التركيز على إبراز نقاط القوة الإيجابية وتفادي الأخطاء الشائعة.',
    priceLabel: '$35 / وثيقة',
    turnaround: '24–48 ساعة',
    deliveryMode: 'تدقيق ومراجعة إلكترونية',
    includes: ['تدقيق لغوي ونحوي', 'تحسين هيكل الصياغة'],
    excludes: [],
    requirements: [],
    packages: [],
    faqs: [],
    cancellationPolicy: '',
    requestContextFields: [],
    contextualLinks: [],
  },
  {
    id: 'service-scholarship-application-guidance',
    slug: 'scholarship-application-guidance',
    title: 'إرشاد وتجهيز ملفات التقديم للمنح الدراسية',
    audience: 'student',
    category: 'منح وقبولات',
    badge: 'خدمة طلابية',
    shortDescription:
      'توجيه خطوة بخطوة لاستكمال كافة متطلبات المنح الحكومية والجامعية الدولية مع فحص معايير الاستحقاق.',
    description:
      'دعم كامل ومراجعة شاملة لملفات المنح قبل إرسالها لزيادة فرص القبول وتحسين الملف التنافسي.',
    priceLabel: '$59 / تقديم',
    turnaround: '3–5 أيام عمل',
    deliveryMode: 'جلسات إرشاد وتدقيق',
    includes: ['فحص المستندات', 'التأكد من اكتمال المعايير'],
    excludes: [],
    requirements: [],
    packages: [],
    faqs: [],
    cancellationPolicy: '',
    requestContextFields: [],
    contextualLinks: [],
  },
  {
    id: 'service-certified-academic-translation',
    slug: 'certified-academic-translation',
    title: 'الترجمة المعتمدة للوثائق الأكاديمية',
    audience: 'general',
    category: 'الوثائق والترجمة',
    badge: 'خدمة عامة ودعم',
    shortDescription:
      'تجهيز ترجمة احترافية للوثائق الأكاديمية المطلوبة في ملفات الدراسة والتقديم، مع مراجعة شكلية قبل التسليم.',
    description:
      'خدمة دعم عامة يمكن أن يحتاجها الطالب في أكثر من سياق، مثل ملف جامعة أو منحة.',
    priceLabel: 'يحدد حسب الوثيقة',
    turnaround: 'حسب عدد الوثائق',
    deliveryMode: 'إلكتروني / حسب الحالة',
    includes: [
      'فحص أولي لنوع الوثيقة واللغة المطلوبة.',
      'ترجمة محتوى الوثيقة الأكاديمية وفق نطاق الطلب.',
    ],
    excludes: [],
    requirements: [],
    packages: [],
    faqs: [],
    cancellationPolicy: '',
    requestContextFields: [],
    contextualLinks: [],
  },
  {
    id: 'service-document-attestation-support',
    slug: 'document-attestation-support',
    title: 'خدمة المتابعة والدعم في تصديق الشهادات',
    audience: 'general',
    category: 'التصديقات والوثائق',
    badge: 'خدمة عامة ودعم',
    shortDescription:
      'إرشاد ومتابعة خطوات تصديق الشهادات والوثائق من الجهات الرسمية والسفارات ذات الصلة.',
    description:
      'مساعدة الطالب في معرفة الآلية الصحيحة والخطوات المطلوبة لمعادلة وتصديق شهاداته الرسمية.',
    priceLabel: '$40 / وثيقة',
    turnaround: '2–4 أيام عمل',
    deliveryMode: 'دعم ومتابعة إلكترونية',
    includes: ['شرح الخطوات والتسلسل الإداري'],
    excludes: [],
    requirements: [],
    packages: [],
    faqs: [],
    cancellationPolicy: '',
    requestContextFields: [],
    contextualLinks: [],
  },
  {
    id: 'service-visa-file-preparation-consultation',
    slug: 'visa-file-preparation-consultation',
    title: 'استشارة تجهيز وتدقيق ملف التأشيرة الدراسية',
    audience: 'general',
    category: 'التأشيرات والسفر',
    badge: 'خدمة عامة ودعم',
    shortDescription:
      'استعراض وتدقيق مستندات الفيزا المدرسية أو الجامعية لضمان تفادي أسباب الرفض الشائعة.',
    description:
      'جلسة استشارية متخصصة لفحص الحساب البنكي والأوراق الرسمية ونموذج التقديم على تأشيرة الدراسة.',
    priceLabel: '$50 / ملف',
    turnaround: '24–48 ساعة',
    deliveryMode: 'جلسة تدقيق عن بُعد',
    includes: ['مراجعة كشف الحساب والوثائق المرفقة'],
    excludes: [],
    requirements: [],
    packages: [],
    faqs: [],
    cancellationPolicy: '',
    requestContextFields: [],
    contextualLinks: [],
  },
];

export function getServiceById(id: string): Service | undefined {
  return PUBLIC_SERVICES.find((service) => service.id === id);
}

