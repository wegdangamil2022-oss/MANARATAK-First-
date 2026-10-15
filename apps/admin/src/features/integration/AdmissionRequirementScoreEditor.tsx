import { useEffect, useRef, useState } from 'react';
import { evaluateAdmissionScores, type AdmissionVersionScale } from '@manaratak/domain';
import { adminApiClient } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
type Requirement = {
  internationalTestId: string;
  testVariantId?: string | null;
  testVersionId?: string | null;
  minimumScore?: number | null;
  sectionScores?: Record<string, unknown> | null;
};
type Contract = {
  testId: string;
  versionId: string;
  scoreScales: AdmissionVersionScale[];
  variants: Array<{ id: string; name: string }>;
  sections: Array<{ id: string; name: string }>;
};
export function AdmissionRequirementScoreEditor({
  requirement,
  onChange,
}: {
  requirement: Requirement;
  onChange: (patch: Partial<Requirement>) => void;
}) {
  const { language } = useTranslation(),
    en = language === 'en',
    generation = useRef(0),
    [contract, setContract] = useState<Contract | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    const request = ++generation.current,
      controller = new AbortController();
    setContract(null);
    setError(false);
    if (!requirement.internationalTestId) return;
    void adminApiClient
      .request<{ data: Contract }>(
        `/public/international-tests/id/${encodeURIComponent(requirement.internationalTestId)}/admission-score-scales${requirement.testVersionId ? `?versionId=${encodeURIComponent(requirement.testVersionId)}` : ''}`,
        { signal: controller.signal, cache: 'no-store' },
      )
      .then(({ data }) => {
        if (request !== generation.current) return;
        if (
          data.testId !== requirement.internationalTestId ||
          !data.versionId ||
          !Array.isArray(data.scoreScales) ||
          !Array.isArray(data.variants) ||
          !Array.isArray(data.sections)
        )
          throw new Error('SCORE_CONTRACT_INVALID');
        setContract(data);
      })
      .catch(() => {
        if (request === generation.current && !controller.signal.aborted) setError(true);
      });
    return () => {
      ++generation.current;
      controller.abort();
    };
  }, [requirement.internationalTestId, requirement.testVersionId]);
  const evaluation = contract
    ? evaluateAdmissionScores(
        {
          variantId: requirement.testVariantId,
          minimumScore: requirement.minimumScore,
          sectionScores: requirement.sectionScores,
        },
        contract.scoreScales,
      )
    : { state: 'UNVERIFIED' };
  return (
    <div className="col-span-full border-t pt-2 space-y-2">
      <p>
        {en ? 'Published test-owner scoring contract' : 'عقد سلّم الدرجات من مالك الاختبار المنشور'}
        :{' '}
        {evaluation.state === 'VALID'
          ? en
            ? 'Verified scale interpretation'
            : 'تفسير سلّم موثق'
          : evaluation.state === 'INVALID'
            ? en
              ? 'Score outside the reviewed scale'
              : 'درجة خارج السلّم المراجع'
            : en
              ? 'Unverified — keep the requirement in review and request test-owner interpretation approval.'
              : 'غير موثق — أبقِ المتطلب قيد المراجعة واطلب اعتماد تفسير السلّم من مالك الاختبار.'}
      </p>
      {error && (
        <p role="status">
          {en ? 'Published scoring contract unavailable.' : 'عقد الدرجات المنشور غير متاح.'}
        </p>
      )}
      {contract && (
        <>
          <p>
            {en ? 'Version' : 'الإصدار'}: {contract.versionId}
          </p>
          <label>
            <input
              type="checkbox"
              checked={Boolean(requirement.testVersionId)}
              onChange={(e) =>
                onChange({ testVersionId: e.target.checked ? contract.versionId : null })
              }
            />
            {en ? 'Pin this reviewed version' : 'تثبيت هذا الإصدار المراجع'}
          </label>
          <label>
            {en ? 'Variant' : 'نوع الاختبار'}
            <select
              value={requirement.testVariantId ?? ''}
              onChange={(e) =>
                onChange({ testVariantId: e.target.value || null, sectionScores: null })
              }
            >
              <option value="">{en ? 'No variant' : 'دون نوع محدد'}</option>
              {contract.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          {contract.sections.map((section) => {
            const value = requirement.sectionScores?.[section.id];
            return (
              <label key={section.id}>
                {section.name}
                <input
                  type="number"
                  step="any"
                  value={typeof value === 'number' ? value : ''}
                  onChange={(e) => {
                    const scores = { ...requirement.sectionScores };
                    if (e.target.value === '') delete scores[section.id];
                    else scores[section.id] = Number(e.target.value);
                    onChange({ sectionScores: Object.keys(scores).length ? scores : null });
                  }}
                />
              </label>
            );
          })}
        </>
      )}
    </div>
  );
}
