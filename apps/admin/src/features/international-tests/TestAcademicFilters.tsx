import { GraduationCap, Languages, Network } from 'lucide-react';
import { CanonicalPicker } from '../../components/CanonicalPicker';
import { canonicalPickerApi } from '../../api/canonicalPickers';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';

export function TestAcademicFilters({
  params,
  ar,
  change,
}: {
  params: URLSearchParams;
  ar: boolean;
  change: (key: string, value: string) => void;
}) {
  const { hasPermission } = useAdminAuthorization();
  return (
    <>
      {hasPermission('admin:reference-data:manage') && (
        <CanonicalPicker
          compact
          optional
          paged
          allowInactive
          displayMode="label"
          label={ar ? 'لغة الاختبار المرتبطة' : 'Linked test language'}
          icon={<Languages size={16} />}
          value={params.get('languageReferenceId')}
          reloadKey={'test-language:' + params.get('languageReferenceId')}
          load={(q, page) => canonicalPickerApi.languages(q, page)}
          onChange={(id) => change('languageReferenceId', id ?? '')}
        />
      )}
      {hasPermission('admin:academic-taxonomy:manage') && (
        <>
          <CanonicalPicker
            compact
            optional
            allowInactive
            displayMode="label"
            label={ar ? 'الدرجة التعليمية المرتبطة' : 'Linked degree level'}
            icon={<GraduationCap size={16} />}
            value={params.get('degreeLevelId')}
            reloadKey={'test-degree:' + params.get('degreeLevelId')}
            load={(q) => canonicalPickerApi.degreeLevels(q)}
            onChange={(id) => change('degreeLevelId', id ?? '')}
          />
          <CanonicalPicker
            compact
            optional
            paged
            allowInactive
            displayMode="label"
            label={ar ? 'المجال الأكاديمي المرتبط' : 'Linked academic field'}
            icon={<Network size={16} />}
            value={params.get('taxonomyNodeId')}
            reloadKey={'test-field:' + params.get('taxonomyNodeId')}
            load={(q, page) => canonicalPickerApi.taxonomyNodes(undefined, q, page)}
            onChange={(id) => change('taxonomyNodeId', id ?? '')}
          />
        </>
      )}
    </>
  );
}
