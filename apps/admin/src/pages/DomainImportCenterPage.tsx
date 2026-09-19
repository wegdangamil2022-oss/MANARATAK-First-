import { Navigate, useParams } from 'react-router-dom';
import { ImportAdminPage, type DomainKey } from './ImportAdminPage';

const DOMAIN_ROUTE_MAP: Record<string, Exclude<DomainKey, 'ALL'>> = {
  universities: 'UNIVERSITIES',
  majors: 'MAJORS',
  courses: 'COURSES',
  'international-tests': 'TESTS',
  tests: 'TESTS',
  services: 'SERVICES',
  cms: 'CMS',
};

export function DomainImportCenterPage() {
  const { domainKey = '' } = useParams();
  if (domainKey === 'scholarships') return <Navigate to="/imports/scholarships" replace />;
  const domain = DOMAIN_ROUTE_MAP[domainKey.toLowerCase()];
  if (!domain) return <Navigate to="/imports" replace />;
  return <ImportAdminPage fixedDomain={domain} />;
}
