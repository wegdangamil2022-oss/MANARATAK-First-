import { useState } from 'react';
import { CalendarClock, Eye, Route } from 'lucide-react';
import {
  normalizeCourseDeliveryPolicy,
  type CourseDto,
  type CourseCurriculumSnapshotDto,
  type CourseDeliveryPolicy,
} from '@manaratak/domain';
import type { NativeCourseCommand } from './NativeCourseCurriculumPanel';
import { useCourseCopy } from './useCourseCopy';

export function NativeCourseDeliveryPanel({
  course,
  snapshot,
  command,
  disabled,
  onDirty,
}: {
  course: CourseDto;
  snapshot: CourseCurriculumSnapshotDto;
  command: NativeCourseCommand;
  disabled: boolean;
  onDirty: (dirty: boolean) => void;
}) {
  const { tr } = useCourseCopy();
  const [policy, setPolicy] = useState(() =>
    normalizeCourseDeliveryPolicy(course.optionalFields?.deliveryPolicy),
  );
  const [error, setError] = useState('');
  const modules = snapshot.modules
    .filter((row) => row.status !== 'ARCHIVED')
    .sort((a, b) => a.position - b.position);
  const lessons = modules.flatMap((module) =>
    snapshot.lessons
      .filter((row) => row.moduleId === module.id && row.status !== 'ARCHIVED')
      .sort((a, b) => a.position - b.position),
  );
  const change = (next: CourseDeliveryPolicy) => {
    setPolicy(next);
    onDirty(true);
  };
  return (
    <section className="course-panel native-delivery">
      <h2>
        <CalendarClock size={18} />
        {tr('المعاينات وجدولة المحاضرات', 'Previews and lecture scheduling')}
      </h2>
      <p>
        {tr(
          'الأوقات أدناه بتوقيت UTC. المعاينة تتيح محتوى المحاضرة المحددة للجميع بعد نشر الدورة وبلوغ موعد الإتاحة. تبقى اختبارات الطالب وإجاباته محمية.',
          'Times below are UTC. Preview makes the selected lecture public after publication and release. Student assessments and answers remain protected.',
        )}
      </p>
      <label className="course-field">
        <span>
          <Route size={18} />
          {tr('ترتيب التعلم', 'Learning order')}
        </span>
        <select
          disabled={disabled}
          value={policy.sequence}
          onChange={(event) =>
            change({ ...policy, sequence: event.target.value as CourseDeliveryPolicy['sequence'] })
          }
        >
          <option value="FREE">{tr('حر', 'Free')}</option>
          <option value="SEQUENTIAL">
            {tr('متسلسل؛ إكمال المحاضرة السابقة', 'Sequential; complete the previous lecture')}
          </option>
        </select>
      </label>
      <div
        className="course-table-scroll"
        tabIndex={0}
        role="region"
        aria-label={tr('إتاحة المحاضرات', 'Lecture delivery')}
      >
        <table className="course-table">
          <thead>
            <tr>
              <th>{tr('المحاضرة', 'Lecture')}</th>
              <th>
                <Eye size={18} />
                {tr('معاينة عامة', 'Public preview')}
              </th>
              <th>{tr('الإتاحة UTC', 'Release UTC')}</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((lesson) => {
              const rule = policy.lessons[lesson.id] ?? { preview: false, availableAt: null };
              const set = (patch: Partial<typeof rule>) =>
                change({
                  ...policy,
                  lessons: { ...policy.lessons, [lesson.id]: { ...rule, ...patch } },
                });
              return (
                <tr key={lesson.id}>
                  <td>{lesson.title}</td>
                  <td>
                    <input
                      aria-label={`${tr('معاينة', 'Preview')} ${lesson.title}`}
                      type="checkbox"
                      checked={rule.preview}
                      disabled={disabled}
                      onChange={(event) => set({ preview: event.target.checked })}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`${tr('موعد UTC', 'UTC release')} ${lesson.title}`}
                      type="datetime-local"
                      step="60"
                      value={rule.availableAt?.slice(0, 16) ?? ''}
                      disabled={disabled}
                      onChange={(event) =>
                        set({
                          availableAt: event.target.value ? `${event.target.value}:00.000Z` : null,
                        })
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {error && <p role="alert">{error}</p>}
      <button
        className="course-button primary"
        disabled={disabled}
        onClick={() => {
          setError('');
          void command('delivery-policy', policy, 'PUT').catch((cause) =>
            setError(cause instanceof Error ? cause.message : 'COURSE_DELIVERY_SAVE_FAILED'),
          );
        }}
      >
        {tr('حفظ الإتاحة والمعاينات', 'Save delivery and previews')}
      </button>
    </section>
  );
}
