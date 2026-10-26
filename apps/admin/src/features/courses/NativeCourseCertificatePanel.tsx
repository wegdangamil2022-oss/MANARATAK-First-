import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { adminApiClient } from '../../api/client';
import type { CourseCertificateBinding } from '@manaratak/domain';
import type { NativeCourseCommand } from './NativeCourseCurriculumPanel';
import { useCourseCopy } from './useCourseCopy';
type Choice = CourseCertificateBinding & { name: string; issuerName: string; version: string };
export function NativeCourseCertificatePanel({
  id,
  command,
  disabled,
  onDirty,
}: {
  id: string;
  command: NativeCourseCommand;
  disabled: boolean;
  onDirty: (dirty: boolean) => void;
}) {
  const { tr } = useCourseCopy();
  const [data, setData] = useState<{
    binding: CourseCertificateBinding | null;
    health: { status: 'READY' | 'UNAVAILABLE'; code: string | null };
    canBind: boolean;
    templates: Choice[];
  }>();
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    void adminApiClient
      .request<NonNullable<typeof data>>(`/admin/courses/${id}/certificate-binding`)
      .then((value) => {
        if (alive) {
          setData(value);
          setSelected(value.binding?.templateVersionId ?? '');
        }
      })
      .catch((cause) => {
        if (alive)
          setError(
            cause instanceof Error ? cause.message : 'COURSE_CERTIFICATE_BINDING_UNAVAILABLE',
          );
      });
    return () => {
      alive = false;
    };
  }, [id]);
  return (
    <section className="course-panel">
      <h2>
        <Award size={18} />
        {tr('القالب والجهة المصدرة', 'Certificate template and issuer')}
      </h2>
      <p>
        {tr(
          'يثبت الربط إصدار القالب لهذه النسخة من الدورة. يتطلب تغييره صلاحية اعتماد قوالب الشهادات؛ الإصدار يتم بعد الإكمال الموثق فقط.',
          'The binding pins a template version for this course version. Changes require certificate-template approval permission; issuance follows verified completion only.',
        )}
      </p>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <p role="status">
            {data.health.status === 'READY'
              ? tr(
                  'القالب والجهة متاحان؛ التحقق من خدمة الإصدار يتم عند معالجة الإكمال.',
                  'Template and issuer available; the issuance service is checked when completion is processed.',
                )
              : tr(
                  'ربط الشهادة غير متاح حاليًا؛ راجع القالب والجهة في قسم الشهادات.',
                  'Certificate binding is unavailable; review the template and issuer in Certificates.',
                )}
            {data.health.code && <small dir="ltr"> {data.health.code}</small>}
          </p>
          <label className="course-field">
            <span>{tr('القالب المعتمد', 'Approved template')}</span>
            <select
              aria-label={tr('قالب الشهادة', 'Certificate template')}
              value={selected}
              disabled={disabled || !data.canBind}
              onChange={(event) => {
                setSelected(event.target.value);
                onDirty(true);
              }}
            >
              <option value="">
                {tr('قالب منارتك الافتراضي المعتمد', 'Approved default Manaratak template')}
              </option>
              {data.binding &&
                !data.templates.some(
                  (row) => row.templateVersionId === data.binding?.templateVersionId,
                ) && (
                  <option value={data.binding.templateVersionId}>
                    {tr(
                      'الربط المحفوظ؛ تحقق من صلاحيته في الشهادات',
                      'Saved binding; check validity in Certificates',
                    )}
                  </option>
                )}
              {data.templates.map((row) => (
                <option key={row.templateVersionId} value={row.templateVersionId}>
                  {row.name} · {row.issuerName} · {row.version}
                </option>
              ))}
            </select>
          </label>
          {data.canBind && (
            <button
              className="course-button primary"
              disabled={disabled}
              onClick={() => {
                const choice = data.templates.find((row) => row.templateVersionId === selected);
                if (selected && !choice) {
                  setError(
                    tr('اختر قالبًا معتمدًا متاحًا.', 'Select an available approved template.'),
                  );
                  return;
                }
                void command(
                    'certificate-binding',
                  {
                    binding: choice
                      ? {
                          templateId: choice.templateId,
                          templateVersionId: choice.templateVersionId,
                          issuerId: choice.issuerId,
                        }
                      : null,
                  },
                  'PUT',
                ).catch((cause) =>
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : 'COURSE_CERTIFICATE_BINDING_SAVE_FAILED',
                  ),
                );
              }}
            >
              {tr('حفظ ربط الشهادة', 'Save certificate binding')}
            </button>
          )}
        </>
      )}
    </section>
  );
}
