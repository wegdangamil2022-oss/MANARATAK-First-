import { GraduationCap, Languages, Network } from 'lucide-react';
import { RelatedCatalogPicker } from '../../components/RelatedCatalogPicker';
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
        <RelatedCatalogPicker catalog="international-tests" facet="languageReferenceId" context={params} ar={ar}
          label={ar ? 'لغة الاختبار المرتبطة' : 'Linked test language'}
          icon={<Languages size={16} />}
          value={params.get('languageReferenceId')}
          onChange={(id) => change('languageReferenceId', id ?? '')}
        />
      )}
      {hasPermission('admin:academic-taxonomy:manage') && (
        <>
          <RelatedCatalogPicker catalog="international-tests" facet="degreeLevelId" context={params} ar={ar}
            label={ar ? 'الدرجة التعليمية المرتبطة' : 'Linked degree level'}
            icon={<GraduationCap size={16} />}
            value={params.get('degreeLevelId')}
            onChange={(id) => change('degreeLevelId', id ?? '')}
          />
          <RelatedCatalogPicker catalog="international-tests" facet="taxonomyNodeId" context={params} ar={ar}
            label={ar ? 'المجال الأكاديمي المرتبط' : 'Linked academic field'}
            icon={<Network size={16} />}
            value={params.get('taxonomyNodeId')}
            onChange={(id) => change('taxonomyNodeId', id ?? '')}
          />
        </>
      )}
    </>
  );
}
