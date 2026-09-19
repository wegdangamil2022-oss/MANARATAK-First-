import type { ApplicationMilestone, PushNotificationItem } from '../types';

/** Explicit offline/dev seed for Phase 15 personal UI only; never domain catalog truth. */
export const INITIAL_MILESTONES: ApplicationMilestone[] = [
  {
    id: 'track-erasmus',
    scholarshipId: 'erasmus-plus',
    scholarshipTitle: 'منحة إيراسموس + (أوروبا)',
    country: '🇪🇺 أوروبا',
    deadline: '2026-10-30',
    stage: 'كتابة خطاب الدافع',
    progress: 50,
    notes:
      'تم إنهاء المسودة الأولى لخطاب الدافع باستخدام أداة الذكاء الاصطناعي في منارتك. متبقي مراجعة رسائل التوصية.',
    checklist: [
      { id: 'c-1', task: 'ترجمة وتصديق كشف العلامات وشهادة البكالوريوس', completed: true },
      { id: 'c-2', task: 'إعداد السيرة الذاتية بتنسيق Europass', completed: true },
      { id: 'c-3', task: 'كتابة خطاب الدافع المخصص للجامعات الأوروبية', completed: false },
      { id: 'c-4', task: 'الحصول على خطابي توصية من أساتذة الجامعة', completed: false },
      { id: 'c-5', task: 'تقديم الطلب الإلكتروني على البوابة الرسمية', completed: false },
    ],
  },
  {
    id: 'track-chevening',
    scholarshipId: 'chevening-uk',
    scholarshipTitle: 'منحة تشيفنينغ (بريطانيا)',
    country: '🇬🇧 بريطانيا',
    deadline: '2026-11-05',
    stage: 'تجهيز المستندات',
    progress: 25,
    notes: 'بدء صياغة المقالات الأربعة الخاصة بالقيادة وبناء العلاقات والخطط المستقبلية.',
    checklist: [
      { id: 'ch-1', task: 'اختيار 3 برامج ماجستير في 3 جامعات بريطانية مختلفة', completed: true },
      { id: 'ch-2', task: 'كتابة مقال القيادة والتأثير (Leadership Essay)', completed: false },
      { id: 'ch-3', task: 'كتابة مقال بناء شبكة العلاقات (Networking Essay)', completed: false },
      {
        id: 'ch-4',
        task: 'كتابة مقال دراسة الماجستير في بريطانيا (Studying in the UK)',
        completed: false,
      },
      { id: 'ch-5', task: 'كتابة مقال الخطة المهنية المستقبلية (Career Plan)', completed: false },
    ],
  },
];

export const INITIAL_NOTIFICATIONS: PushNotificationItem[] = [
  {
    id: 'notif-1',
    title: '⚡ عاجل: منحة تشيفنينغ البريطانية فتحت التقديم!',
    body: 'تم فتح باب التقديم رسمياً لدرجة الماجستير بتمويل كامل يشمل الرسوم والمعيشة وتذاكر السفر للعام الدراسي القادم.',
    timestamp: 'الآن',
    type: 'urgent',
    read: false,
    actionType: 'scholarship',
    targetId: 'chevening-uk',
  },
  {
    id: 'notif-2',
    title: 'فرصة مميزة: منحة الحكومة الصينية CSC 2026',
    body: 'إعفاء كامل من الرسوم مع سكن جامعي وراتب شهري مجزي في كبرى الجامعات الصينية المرموقة.',
    timestamp: 'منذ ساعة',
    type: 'opportunity',
    read: false,
    actionType: 'scholarship',
    targetId: 'csc-china',
  },
  {
    id: 'notif-3',
    title: '✨ أداة ذكاء اصطناعي جديدة: مولد خطاب الدافع',
    body: 'استخدم الذكاء الاصطناعي لصياغة خطاب دافع مقنع ومتوافق مع شروط المنح الأوروبية والأمريكية خلال ثوانٍ.',
    timestamp: 'منذ 3 ساعات',
    type: 'system',
    read: true,
    actionType: 'ai-tools',
  },
  {
    id: 'notif-4',
    title: 'تنبيه اقتراب موعد: منحة داد الألمانية DAAD',
    body: 'تذكير: متبقي 44 يوماً فقط على إغلاق باب التقديم لبرامج الهندسة والتنمية المستدامة في ألمانيا.',
    timestamp: 'أمس',
    type: 'deadline',
    read: true,
    actionType: 'scholarship',
    targetId: 'daad-germany',
  },
];
