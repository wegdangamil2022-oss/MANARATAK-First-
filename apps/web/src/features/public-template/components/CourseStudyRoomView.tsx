import type { Course } from '../types';
/** Neutral empty study room; content comes only from owner-published records. */
export function CourseStudyRoomView({course,onBack}:{course?:Course;onBack:()=>void;onRestrictedAction?:(msg?:string)=>void}) {
  return <main dir="rtl" className="mx-auto max-w-5xl px-4 py-8 text-[var(--mn-text-primary)]">
    <button type="button" onClick={onBack} className="mb-6 rounded-lg border px-4 py-2">العودة</button>
    <h1 className="mb-3 text-2xl font-bold">{course?.title||'محتوى الدورة'}</h1>
    <p className="rounded-xl border p-6">لم تُنشر دروس لهذه الدورة بعد. سيظهر هنا المحتوى الذي يعتمده مالك المنصة.</p>
  </main>;
}
