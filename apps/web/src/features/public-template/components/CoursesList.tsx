import React from 'react';
import { Course } from '../types';
import { BookOpen, Star, Clock, Users, Award, PlayCircle } from 'lucide-react';

interface CoursesListProps {
  courses: Course[];
  onStartCourse?: (course: Course) => void;
}

export const CoursesList: React.FC<CoursesListProps> = ({ courses }) => {
  return (
    <div className="w-full px-4 py-3 space-y-3 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[var(--mn-heading)] flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-[var(--mn-heading)]" />
            <span>الدورات التدريبية والتأهيلية للمنح</span>
          </h2>
          <p className="text-[11px] text-[var(--mn-text-muted)]">
            برامج تدريبية معتمدة لإتقان اللغة والخطابات الأكاديمية وبناء الملف الشخصي
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-[var(--mn-surface)] rounded-2xl border border-[#142B5F] dark:border-[#D6A43B]/60 hover:border-[#142B5F] shadow-xs hover:shadow-md transition-all overflow-hidden p-3.5 space-y-2.5 text-right mn-panel "
          >
            <div className="flex items-start gap-3">
              <img
                src={course.imageUrl}
                alt={course.title}
                className="w-16 h-16 rounded-xl object-cover border border-[var(--mn-border)] shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="px-2 py-0.5 rounded-full bg-[var(--mn-surface-muted)] text-[var(--mn-heading)] font-semibold text-[9px] mn-panel ">
                    {course.isFree ? (course.category || 'تأهيل أكاديمي') : 'مدفوعة'}
                  </span>
                  <div className="flex items-center gap-1 text-[var(--mn-accent-text)] text-[10px] font-bold">
                    <Star className="w-3 h-3 fill-[var(--mn-accent-soft)]" />
                    <span>{course.rating ?? 'غير متوفر'}</span>
                  </div>
                </div>

                <h3 className="text-xs font-bold text-[var(--mn-heading)] mt-1 leading-snug">
                  {course.title}
                </h3>
                <p className="text-[10px] text-[var(--mn-text-muted)] font-semibold mt-0.5">
                  تقديم: {course.instructor} • {course.provider}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--mn-border)] text-[11px]">
              <div className="flex items-center gap-3 text-[var(--mn-text-muted)] font-semibold">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[var(--mn-heading)]" />
                  {course.duration}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-[var(--mn-accent-text)]" />
                  {course.studentsCount == null ? 'عدد الطلاب غير متوفر' : `${course.studentsCount.toLocaleString()} طالب`}
                </span>
              </div>

              <button className="flex items-center gap-1 px-3 py-1 bg-[var(--mn-primary)] hover:bg-[var(--mn-primary)] text-[var(--mn-accent-soft)] rounded-xl text-xs font-bold active:scale-95 transition-all mn-inverse hover:mn-inverse ">
                <PlayCircle className="w-3.5 h-3.5" />
                <span>متابعة الدورة</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
