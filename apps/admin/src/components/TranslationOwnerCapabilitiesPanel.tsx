import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TranslationOwnerCapability } from '@absheer/shared';
import { adminApiClient } from '../api/client';
const names: Record<string, string> = {
  UNIVERSITY: 'الجامعات',
  MAJOR: 'التخصصات والزمالات',
  INTERNATIONAL_TEST: 'الاختبارات الدولية',
  SCHOLARSHIP: 'المنح',
  COURSE: 'الدورات',
  STUDY_DESTINATION: 'وجهات الدراسة',
  SERVICE: 'الخدمات',
  CAREER_JOB: 'الوظائف',
};
const workflows: Record<TranslationOwnerCapability['descriptionWorkflow'], string> = {
  NORMALIZED_OWNER: 'الوصف له مسار ترجمة لدى المالك؛ تفعيل الكتابة معلق.',
  VERSIONED_SECTIONS: 'الأوصاف ضمن أقسام نسخة التخصص؛ لا يُنشأ وصف موازٍ.',
  NATIVE_OWNER_WORKSPACE: 'تُراجع النصوص العربية والإنجليزية وتُنشر من مساحة المالك الأصلية.',
  OWNER_CONTRACT_REQUIRED: 'إتاحة ترجمة الوصف تنتظر اكتمال عقد المصدر والمراجعة والنشر.',
};
export function TranslationOwnerCapabilitiesPanel() {
  const [data, setData] = useState<TranslationOwnerCapability[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    adminApiClient
      .request<{ data: TranslationOwnerCapability[] }>('/admin/translations/capabilities', {
        signal: controller.signal,
      })
      .then((result) => {
        if (!controller.signal.aborted) setData(result.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('تعذر تحميل قدرات المالكين.');
      });
    return () => controller.abort();
  }, []);
  return (
    <section aria-label="قدرات الترجمة لدى المالكين" className="rounded-2xl border bg-white p-4">
      <h2>نطاقات الترجمة ومسارات المراجعة</h2>
      <p>
        تعرض هذه القائمة المسارات المسموحة لك. ظهور النطاق لا يمنح إذنًا بالنشر أو يفعّل تحريرًا
        معلقًا.
      </p>
      {error && <p role="alert">{error}</p>}
      <ul>
        {data.map((capability) => (
          <li key={capability.key}>
            <Link to={capability.ownerPath}>{names[capability.key] ?? capability.key}</Link> —{' '}
            {workflows[capability.descriptionWorkflow]}
          </li>
        ))}
      </ul>
    </section>
  );
}
