/** Legacy filter values remain stable; only their presentation is localized. */
const keys: Readonly<Record<string, string>> = {
  'الكل': 'public_all',
  'أداة ذكية': 'public_tool_smart',
  'حسابية': 'public_tool_calculator',
  'بيانات ومقارنة': 'public_tool_data_comparison',
  'هجينة': 'public_tool_hybrid',
  'متاحة الآن': 'public_tool_available_now',
  'قريبًا': 'public_tool_coming_soon',
  'منح': 'public_scholarships',
  'جامعات': 'public_universities',
  'تخصصات': 'public_majors',
  'دول': 'public_countries',
  'دورات': 'public_courses',
  'اختبارات': 'public_exams',
  'مقالات': 'public_enum_articles',
  'خدمات': 'public_services',
  'أدوات': 'public_tools',
  'وظائف وتدريب': 'public_jobs_and_internships',
  'طلب/متابعة': 'public_application_tracking',
  'تنبيه': 'public_alert',
  'ماجستير': 'public_masters',
  'دكتوراه': 'public_doctorate',
  'بكالوريوس': 'public_bachelors',
  'زمالة أبحاث': 'public_research_fellowship',
  'غير محدد': 'public_not_specified',
  'غير مصنف': 'public_unclassified',
  'غير متاح': 'public_unavailable',
};

export function publicEnumLabel(value: string, translate: (key: string) => string): string {
  return Object.prototype.hasOwnProperty.call(keys, value) ? translate(keys[value]) : value;
}
