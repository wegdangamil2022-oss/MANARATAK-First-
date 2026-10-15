import type { CountryDestination, Course, Scholarship, Service, University } from './types';

/**
 * Presentation-only snapshots of the ORIGINAL homepage design.
 * This is intentionally NOT the published catalog, and is never used for search,
 * detail navigation, eligibility, favorites, API responses or database records.
 * The homepage displays these only inside an explicitly inert "design preview" frame.
 */
export const HOME_DESIGN_SCHOLARSHIPS = [
  { id: 'home-preview-csc', title: 'منحة الحكومة الصينية (CSC)', country: 'الصين', featured: true,
    imageUrl: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=800&q=80' },
  { id: 'home-preview-turkiye', title: 'منحة الحكومة التركية (Turkiye Burslari)', country: 'تركيا', featured: true,
    imageUrl: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80' },
] as Scholarship[];

export const HOME_DESIGN_UNIVERSITIES = [
  { id: 'home-preview-oxford', name: 'جامعة أكسفورد', nameEn: 'University of Oxford',
    country: 'المملكة المتحدة', countryFlag: '🇬🇧', globalRank: 1, scholarshipCount: 42,
    imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80' },
  { id: 'home-preview-tsinghua', name: 'جامعة تسينغهوا', nameEn: 'Tsinghua University',
    country: 'الصين', countryFlag: '🇨🇳', globalRank: 12, scholarshipCount: 65,
    imageUrl: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=600&q=80' },
  { id: 'home-preview-peking', name: 'جامعة بكين', nameEn: 'Peking University',
    country: 'الصين', countryFlag: '🇨🇳', globalRank: 14, scholarshipCount: 58,
    imageUrl: 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?auto=format&fit=crop&w=600&q=80' },
] as University[];

export const HOME_DESIGN_COUNTRIES = [
  { id: 'home-preview-china', name: 'الصين', flag: '🇨🇳', imageUrl: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=800&q=80' },
  { id: 'home-preview-turkey', name: 'تركيا', flag: '🇹🇷', imageUrl: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80' },
  { id: 'home-preview-malaysia', name: 'ماليزيا', flag: '🇲🇾', imageUrl: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80' },
  { id: 'home-preview-germany', name: 'ألمانيا', flag: '🇩🇪', imageUrl: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=800&q=80' },
  { id: 'home-preview-uk', name: 'المملكة المتحدة', flag: '🇬🇧', imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80' },
  { id: 'home-preview-saudi', name: 'السعودية', flag: '🇸🇦', imageUrl: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?auto=format&fit=crop&w=800&q=80' },
  { id: 'home-preview-france', name: 'فرنسا', flag: '🇫🇷', imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80' },
  { id: 'home-preview-japan', name: 'اليابان', flag: '🇯🇵', imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80' },
] as CountryDestination[];

export const HOME_DESIGN_COURSES = [
  { id: 'home-preview-ai', title: 'دورة مقدمة في الذكاء الاصطناعي وتطبيقاته', provider: 'منصات عالمية • Stanford Online',
    imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=600&q=80' },
  { id: 'home-preview-cs', title: 'دورة شاملة في مبادئ علوم الحاسوب والبرمجة', provider: 'منصات عالمية • Harvard University',
    imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80' },
  { id: 'home-preview-data', title: 'دورة أساسيات علم البيانات وتعلم الآلة', provider: 'منصات عالمية • Google Career Certificates',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80' },
  { id: 'home-preview-visa', title: 'دليل المقابلات الشخصية السفارات وتأشيرة الدراسة', provider: 'أكاديمية منارتك',
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80' },
  { id: 'home-preview-writing', title: 'إعداد خطاب الدافع الأكاديمي والسيرة الذاتية', provider: 'أكاديمية منارتك',
    imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80' },
] as Course[];

export const HOME_DESIGN_SERVICES = [
  { id: 'home-preview-guidance', title: 'استشارة اختيار الجامعة والتخصص المناسب', audience: 'student',
    shortDescription: 'جلسة إرشادية تساعدك على اختيار الجامعة والتخصص المناسب.' },
  { id: 'home-preview-sop', title: 'مراجعة وتدقيق السيرة الذاتية وخطاب الدافع', audience: 'student',
    shortDescription: 'مراجعة مستندات القبول الجامعي وتجهيزها.' },
  { id: 'home-preview-scholarship', title: 'إرشاد وتجهيز ملفات التقديم للمنح الدراسية', audience: 'student',
    shortDescription: 'مساعدة في ترتيب خطوات وملفات التقديم.' },
  { id: 'home-preview-translation', title: 'الترجمة المعتمدة للوثائق الأكاديمية', audience: 'general',
    shortDescription: 'عرض توضيحي لشكل بطاقة الترجمة الأكاديمية.' },
  { id: 'home-preview-visa', title: 'إرشاد إجراءات تأشيرة الدراسة', audience: 'general',
    shortDescription: 'عرض توضيحي لشكل بطاقة الخدمات العامة.' },
] as Service[];
