import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
import React from 'react';
import { Course } from '../types';
import { BookOpen, Star, Clock, Users, Award, PlayCircle } from 'lucide-react';

interface CoursesListProps {
  courses: Course[];
  onStartCourse?: (course: Course) => void;
}

export const CoursesList: React.FC<CoursesListProps> = ({ courses }) => {
  const { t: publicT } = usePublicTemplateTranslation();

  return (
    <div className="w-full px-4 py-3 space-y-3 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[var(--ab-heading)] flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-[var(--ab-heading)]" />
            <span>{publicT('public_training_and_scholarship_preparation_courses')}</span>
          </h2>
          <p className="text-[11px] text-[var(--ab-text-muted)]">{publicT('public_accredited_training_programs_for_language_skills_academic_letters')}</p>
        </div>
      </div>

      <div className="space-y-3">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-[var(--ab-surface)] rounded-2xl border border-[#142B5F] dark:border-[#D6A43B]/60 hover:border-[#142B5F] shadow-xs hover:shadow-md transition-all overflow-hidden p-3.5 space-y-2.5 text-start ab-panel "
          >
            <div className="flex items-start gap-3">
              <img
                src={course.imageUrl}
                alt={course.title}
                className="w-16 h-16 rounded-xl object-cover border border-[var(--ab-border)] shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="px-2 py-0.5 rounded-full bg-[var(--ab-surface-muted)] text-[var(--ab-heading)] font-semibold text-[9px] ab-panel ">
                    {course.isFree ? (course.category || publicT('public_academic_preparation')) : publicT('public_paid')}
                  </span>
                  <div className="flex items-center gap-1 text-[var(--ab-accent-text)] text-[10px] font-bold">
                    <Star className="w-3 h-3 fill-[var(--ab-accent-soft)]" />
                    <span>{course.rating ?? publicT('public_unavailable_2')}</span>
                  </div>
                </div>

                <h3 className="text-xs font-bold text-[var(--ab-heading)] mt-1 leading-snug">
                  {course.title}
                </h3>
                <p className="text-[10px] text-[var(--ab-text-muted)] font-semibold mt-0.5">{publicT('public_presented_by')}{' '}{course.instructor} • {course.provider}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--ab-border)] text-[11px]">
              <div className="flex items-center gap-3 text-[var(--ab-text-muted)] font-semibold">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[var(--ab-heading)]" />
                  {course.duration}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-[var(--ab-accent-text)]" />
                  {course.studentsCount == null ? publicT('public_student_count_unavailable') : publicT('public_student_count', { v0: course.studentsCount.toLocaleString() })}
                </span>
              </div>

              <button className="flex items-center gap-1 px-3 py-1 bg-[var(--ab-primary)] hover:bg-[var(--ab-primary)] text-[var(--ab-accent-soft)] rounded-xl text-xs font-bold active:scale-95 transition-all ab-inverse hover:ab-inverse ">
                <PlayCircle className="w-3.5 h-3.5" />
                <span>{publicT('public_continue_course')}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
