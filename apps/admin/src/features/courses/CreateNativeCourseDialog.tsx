import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { reviewReasonHeaders } from '@manaratak/shared';
import { Save } from 'lucide-react';
import { adminApiClient } from '../../api/client';
import { CourseDialog } from './CourseDialog';
import { useCourseCopy } from './useCourseCopy';

export function CreateNativeCourseDialog({ onClose, returnTo }: { onClose: () => void; returnTo: string }) {
  const { tr } = useCourseCopy();
  const navigate = useNavigate();
  const [form, setForm] = useState({ titleAr: '', titleEn: '', learningLanguage: 'ar', category: '', difficultyLevel: '', accessType: 'FREE_STUDY' });
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const created = await adminApiClient.request<{ id: string }>('/admin/courses', { method: 'POST', headers: reviewReasonHeaders(reason.trim()), body: JSON.stringify(form) });
      navigate(`/courses/${encodeURIComponent(created.id)}/editor?returnTo=${encodeURIComponent(returnTo)}`);
    } catch (error) { setError(error instanceof Error ? error.message : tr('تعذر إنشاء المسودة', 'Could not create draft')); }
    finally { setBusy(false); }
  };
  return <CourseDialog title={tr('إنشاء دورة منارتك — مسودة', 'Create a Manaratak course — draft')} onClose={() => { if (!busy) onClose(); }} dirty={!busy && Boolean(form.titleAr || form.titleEn || reason)}>
    <p className="course-hint">{tr('ينشئ هذا الإجراء دورة داخلية فقط. تُستكمل البيانات والمنهج في محرر الدورة، دون نشر تلقائي.', 'This creates an internal course only. Continue its data and curriculum in the course editor; it is not published automatically.')}</p>
    <form onSubmit={submit} className="course-create-form">
      <div className="course-filter-grid">{([['titleAr', tr('اسم الدورة بالعربية', 'Arabic course title')], ['titleEn', tr('اسم الدورة بالإنجليزية', 'English course title')], ['learningLanguage', tr('لغة التدريس — رمز BCP47', 'Learning language — BCP47 code')], ['category', tr('المجال', 'Field')], ['difficultyLevel', tr('المستوى', 'Level')]] as const).map(([key, label]) => <label className="course-field" key={key}><span>{label}</span><input disabled={busy} value={form[key]} required={key === 'titleAr'} minLength={key === 'titleAr' ? 2 : undefined} maxLength={key === 'titleAr' || key === 'titleEn' ? 500 : 200} onChange={event => setForm({ ...form, [key]: event.target.value })}/></label>)}
        <label className="course-field"><span>{tr('سياسة الإتاحة الحالية', 'Existing access policy')}</span><select disabled={busy} value={form.accessType} onChange={event => setForm({ ...form, accessType: event.target.value })}>
          <option value="FREE_STUDY">{tr('دراسة مجانية', 'Free study')}</option><option value="FREE_CERTIFICATE">{tr('شهادة مجانية', 'Free certificate')}</option><option value="FREE_STUDY_AND_CERTIFICATE">{tr('دراسة وشهادة مجانيتان', 'Free study and certificate')}</option><option value="PAID">{tr('تتطلب تصريح المالية الحالي', 'Requires existing financial clearance')}</option>
        </select></label>
      </div>
      <label className="course-field"><span>{tr('مبرر الإنشاء', 'Creation reason')}</span><textarea required disabled={busy} minLength={3} maxLength={2000} value={reason} onChange={event => setReason(event.target.value)}/></label>
      {error && <p role="alert" className="course-error">{error}</p>}
      <button className="course-primary" disabled={busy || reason.trim().length < 3} type="submit"><Save size={16}/>{busy ? tr('جارٍ الحفظ…', 'Saving…') : tr('حفظ المسودة وفتح المحرر', 'Save draft and open editor')}</button>
    </form>
  </CourseDialog>;
}
