import React, { useState } from 'react';
import { Course } from '../types';
import { PlayCircle, ChevronLeft, BookOpen, Award, Globe2 } from 'lucide-react';

interface FeaturedCoursesProps {
  courses: Course[];
  onSelectCourse?: (course: Course) => void;
  onViewAllClick: () => void;
  onRestrictedCourse?: () => void;
}

export const FeaturedCourses: React.FC<FeaturedCoursesProps> = ({
  courses,
  onSelectCourse,
  onViewAllClick,
  onRestrictedCourse,
}) => {
  const [activeCourseTab, setActiveCourseTab] = useState<'global' | 'native'>('global');

  // Global Platforms Courses (3 specialized courses: AI, Computer Science, Data Science / ML)
  const globalCourses: Course[] = [
    {
      id: 'c-ai-intro',
      title: 'دورة مقدمة في الذكاء الاصطناعي وتطبيقاته',
      titleEn: 'Introduction to Artificial Intelligence',
      provider: 'منصات عالمية • Stanford Online',
      instructor: 'د. أندرو نج',
      duration: '16 ساعة • 20 درساً',
      lessonsCount: 20,
      level: 'مبتدئ',
      isFree: false,
      rating: 4.9,
      studentsCount: 34500,
      imageUrl:
        'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80',
      category: 'الذكاء الاصطناعي',
      progressPercent: 25,
    },
    {
      id: 'c-cs-intro',
      title: 'دورة شاملة في مبادئ علوم الحاسوب والبرمجة',
      titleEn: 'CS50: Introduction to Computer Science',
      provider: 'منصات عالمية • Harvard University',
      instructor: 'بروفيسور ديفيد جيه مالان',
      duration: '24 ساعة • 28 درساً',
      lessonsCount: 28,
      level: 'مبتدئ ومتوسط',
      isFree: false,
      rating: 4.9,
      studentsCount: 48200,
      imageUrl:
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
      category: 'علوم الحاسوب',
      progressPercent: 0,
    },
    {
      id: 'c-ml-data',
      title: 'دورة أساسيات علم البيانات وتعلم الآلة',
      titleEn: 'Data Science & Machine Learning Fundamentals',
      provider: 'منصات عالمية • Google Career Certificates',
      instructor: 'فريق خبراء Google',
      duration: '18 ساعة • 22 درساً',
      lessonsCount: 22,
      level: 'متوسط',
      isFree: false,
      rating: 4.8,
      studentsCount: 29800,
      imageUrl:
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
      category: 'علم البيانات',
      progressPercent: 0,
    },
  ];

  // Manartech Native Courses (Programs built specifically within Manartech)
  const nativeCourses: Course[] = [
    {
      id: 'c1',
      title: 'دورة المنح الدراسية والقبولات الجامعية',
      titleEn: 'Scholarships and University Admissions Masterclass',
      provider: 'منصة منارتك',
      instructor: 'أكاديمية منارتك',
      duration: '25 ساعة • 8 وحدات',
      lessonsCount: 8,
      level: 'مبتدئ',
      isFree: false,
      rating: 4.9,
      studentsCount: 265,
      imageUrl:
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
      category: 'المنح والقبولات الجامعية',
      progressPercent: 0,
    },
    {
      id: 'c-manaratak-cv',
      title: 'دورة إعداد السيرة الذاتية وخطاب الدافع للمنح',
      titleEn: 'Academic CV & Motivation Letter Masterclass',
      provider: 'أكاديمية منارتك',
      instructor: 'خبراء منارتك',
      duration: '6 ساعات • 10 دروس',
      lessonsCount: 10,
      level: 'جميع المستويات',
      isFree: false,
      rating: 4.9,
      studentsCount: 15400,
      imageUrl:
        'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80',
      category: 'إعداد الملف الشخصي',
      progressPercent: 0,
    },
    {
      id: 'c5',
      title: 'دليل المقابلات الشخصية وتأشيرة الدراسة',
      titleEn: 'Embassy Interview & Student Visa Mastery',
      provider: 'أكاديمية منارتك',
      instructor: 'د. يوسف التميمي',
      duration: '3.5 ساعة • 7 دروس',
      lessonsCount: 7,
      level: 'متوسط',
      isFree: false,
      rating: 4.9,
      studentsCount: 11200,
      imageUrl:
        'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=600&q=80',
      category: 'إعداد الملف الشخصي',
      progressPercent: 0,
    },
    {
      id: 'c-china-scholarships',
      title: 'الدورة التدريبية للمنح الدراسية في الصين',
      titleEn: 'Masterclass for Studying and Scholarships in China (CSC)',
      provider: 'أكاديمية منارتك',
      instructor: 'خبراء الدراسة في الصين',
      duration: '18 ساعة',
      lessonsCount: 6,
      level: 'جميع المستويات',
      isFree: false,
      rating: 4.9,
      studentsCount: 1420,
      imageUrl:
        'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=600&q=80',
      category: 'المنح والقبولات الجامعية',
      progressPercent: 0,
    },
    {
      id: 'c-duolingo-mastery',
      title: 'الدورة التدريبية لاختبار الدولينجو',
      titleEn: 'Duolingo English Test (DET) Comprehensive Preparation',
      provider: 'أكاديمية منارتك',
      instructor: 'مدربو اختبارات اللغة الإنجليزية',
      duration: '14 ساعة',
      lessonsCount: 30,
      level: 'متوسط',
      isFree: false,
      rating: 4.85,
      studentsCount: null,
      imageUrl:
        'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80',
      category: 'اختبارات اللغة والأكاديميا',
      progressPercent: 0,
    },
    {
      id: 'c-csca-exam',
      title: 'الدورة التدريبية لاختبار CSCA',
      titleEn: 'CSCA International Exam Preparation & Academic Strategies',
      provider: 'أكاديمية منارتك',
      instructor: 'هيئة التدريب التخصصي',
      duration: '12 ساعة',
      lessonsCount: 30,
      level: 'متقدم',
      isFree: false,
      rating: 4.92,
      studentsCount: null,
      imageUrl:
        'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80',
      category: 'اختبارات تخصصية وتأهيلية',
      progressPercent: 0,
    },
    {
      id: 'c-ai-scholarship-applications',
      title: 'الدورة التدريبية لاستخدامات الذكاء الاصطناعي',
      titleEn: 'AI Tools & Workflows for Academic & Scholarship Success',
      provider: 'أكاديمية منارتك',
      instructor: 'وحدة تقنيات الذكاء الاصطناعي الأكاديمي',
      duration: '16 ساعة',
      lessonsCount: 21,
      level: 'جميع المستويات',
      isFree: false,
      rating: 4.95,
      studentsCount: null,
      imageUrl:
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
      category: 'مهارات التقنية والذكاء الاصطناعي',
      progressPercent: 0,
    },
  ];

  const currentCourses = activeCourseTab === 'global' ? globalCourses : nativeCourses;

  const handleCourseClick = (course: Course) => {
    onSelectCourse?.(course);
  };

  return (
    <section
      id="featured-courses-section"
      className="px-0 py-3 w-full font-['Cairo',sans-serif]"
    >
      {/* Standard Framed Container with top accent border only */}
      <div className="relative rounded-3xl p-3 sm:p-4 bg-gradient-to-b from-[var(--mn-surface)] to-[var(--mn-page)]/80 border border-[var(--mn-border)] shadow-xs overflow-hidden mn-panel">
        {/* Elegant top gradient border line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#142B5F] dark:via-[#D6A43B] to-transparent" />
        
        {/* Content Inside the Framed Section */}
        <div className="relative z-10">
          {/* Centered Section Title */}
          <div className="text-center mb-3 sm:mb-4">
            <div className="relative pb-1 mb-1 inline-block">
              <h3 className="text-[14.5px] sm:text-base font-bold text-[#142B5F] dark:text-[#D6A43B] inline-flex items-center justify-center gap-1.5 font-['Cairo',sans-serif]">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#142B5F] border border-[#D6A43B]/60 flex items-center justify-center shrink-0 shadow-2xs">
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D6A43B]" />
                </span>
                <span>الدورات التدريبية والتأهيلية</span>
              </h3>
              <div className="absolute -bottom-0.5 left-0 right-0 h-[2.5px] rounded-full bg-gradient-to-r from-transparent via-[#D6A43B] to-transparent" />
            </div>
            <p className="text-[11px] sm:text-xs text-[var(--mn-text-muted)] font-medium max-w-md mx-auto font-['Cairo',sans-serif]">
              طور مهاراتك من خلال برامج تدريبية متخصصة ومقدمة من أفضل الأكاديميات والجامعات.
            </p>
          </div>

          {/* Dual Tabs Switcher: منصات عالمية & دورات منارتك */}
          <div className="flex items-center justify-center p-1 mb-3.5 max-w-xs mx-auto rounded-2xl bg-[var(--mn-surface-muted)] border border-[var(--mn-border)] shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveCourseTab('global')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer font-['Cairo',sans-serif] ${
                activeCourseTab === 'global'
                  ? 'bg-[#142B5F] text-[#D6A43B] shadow-xs'
                  : 'text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)]'
              }`}
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>منصات عالمية</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCourseTab('native')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer font-['Cairo',sans-serif] ${
                activeCourseTab === 'native'
                  ? 'bg-[#142B5F] text-[#D6A43B] shadow-xs'
                  : 'text-[var(--mn-text-muted)] hover:text-[var(--mn-heading)]'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>دورات منارتك</span>
            </button>
          </div>

          {/* Courses List Wrapper */}
          <div className="space-y-2 w-full">
            {currentCourses.map((course) => (
              <div
                key={course.id}
                role="button"
                tabIndex={0}
                onKeyDown={function (event) {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleCourseClick(course);
                  }
                }}
                onClick={() => handleCourseClick(course)}
                className="group relative flex items-center justify-between gap-2.5 p-2 sm:p-2.5 rounded-xl bg-[var(--mn-surface)] border border-[var(--mn-border)] hover:border-[var(--mn-accent)]/50 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Course Thumbnail */}
                  <div className="relative w-14 h-12 sm:w-16 sm:h-14 rounded-lg overflow-hidden shrink-0 bg-[#142B5F] border border-[var(--mn-border)]/40 mn-inverse">
                    <img
                      src={course.imageUrl}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={(e) => {
                        // Reliable high-tech fallback
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    {/* Play Icon Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayCircle className="w-4 h-4 text-white drop-shadow-md" />
                    </div>
                  </div>

                  {/* Course Info */}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-[11px] sm:text-[12.5px] text-[var(--mn-heading)] group-hover:text-[var(--mn-accent-text)] transition-colors line-clamp-2 leading-tight font-['Cairo',sans-serif]">
                      {course.title}
                    </h4>
                    <p className="text-[9.5px] sm:text-[10px] text-[var(--mn-text-muted)] mt-0.5 font-medium truncate font-['Cairo',sans-serif]">
                      {course.provider}
                    </p>
                  </div>
                </div>

                {/* Arrow Action Indicator */}
                <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[var(--mn-surface-muted)] text-[var(--mn-text-muted)] group-hover:text-[#142B5F] dark:group-hover:text-[#D6A43B] transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                </div>
              </div>
            ))}

            {currentCourses.length === 0 && (
              <div className="text-center py-6 text-sm text-[var(--mn-text-muted)]">
                لا توجد دورات حالياً في هذا القسم.
              </div>
            )}
          </div>

          {/* View All Button */}
          <div className="mt-4 flex justify-center">
            <button
              id="btn-view-all-courses"
              onClick={onViewAllClick}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-[var(--mn-surface-muted)] hover:bg-[#142B5F]/5 dark:hover:bg-[#D6A43B]/10 text-[#142B5F] dark:text-[#D6A43B] border border-[#142B5F]/50 dark:border-[#D6A43B]/50 rounded-full transition-all active:scale-95 font-['Cairo',sans-serif] shadow-xs "
            >
              <span className="text-[12px] sm:text-sm font-bold">تصفح جميع الدورات</span>
              <ChevronLeft className="w-4 h-4 text-[#142B5F] dark:text-[#D6A43B] transition-transform group-hover:-translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
