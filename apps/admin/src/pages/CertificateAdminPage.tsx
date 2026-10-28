import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Award,
  FileBadge2,
  LayoutTemplate,
  Building2,
  ClipboardCheck,
  ShieldCheck,
} from 'lucide-react';
import { useCertificateCopy } from '../features/certificates/certificateHooks';
import { CertificateRegistry } from '../features/certificates/CertificateRegistry';
import { CertificateTemplates } from '../features/certificates/CertificateTemplates';
import { CertificateIssuers } from '../features/certificates/CertificateIssuers';
import { CertificateReviews } from '../features/certificates/CertificateReviews';
import { CertificateTrust } from '../features/certificates/CertificateTrust';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import '../features/reference-data/reference-data.css';
import '../features/certificates/certificates.css';
export function CertificateAdminPage() {
  const { permissions = [] } = useAdminAuthorization();
  const { c, dir } = useCertificateCopy(),
    location = useLocation(),
    [params] = useSearchParams();
  const match = location.pathname.match(
    /^\/certificates\/(templates|issuers)(?:\/([^/]+))?(\/edit)?\/?$/,
  );
  const section =
    match?.[1] ??
    (['registry', 'templates', 'issuers', 'reviews', 'trust'].includes(params.get('section') ?? '')
      ? params.get('section')!
      : 'registry');
  const id = match?.[2] ? decodeURIComponent(match[2]) : undefined;
  const tabs = [
    ['registry', c('سجل الشهادات', 'Certificate registry'), FileBadge2],
    ['templates', c('قوالب الشهادات', 'Templates'), LayoutTemplate],
    ['issuers', c('جهات الإصدار', 'Issuers'), Building2],
    ['reviews', c('المراجعات والاعتمادات', 'Reviews and approvals'), ClipboardCheck],
    ['trust', c('الجاهزية والتحقق', 'Readiness and verification'), ShieldCheck],
  ] as const;
  return (
    <div className="reference-workspace certificate-workspace" dir={dir}>
      <header className="reference-hero">
        <div>
          <span>
            <Award />
            {c('مركز شهادات منارتك', 'MANARATAK certificate center')}
          </span>
          <h1>{c('الشهادات', 'Certificates')}</h1>
          <p>
            {c(
              'إدارة السجل والقوالب والجهات والمراجعات والتحقق.',
              'Manage the registry, templates, issuers, reviews and verification.',
            )}
          </p>
        </div>
      </header>
      <nav
        className="certificate-main-nav admin-section-navigation"
        aria-label={c('مساحات الشهادات', 'Certificate workspaces')}
      >
        {tabs.map(([key, label, Icon]) => (
          <Link
            key={key}
            aria-current={section === key ? 'page' : undefined}
            to={key === 'registry' ? '/certificates' : '/certificates?section=' + key}
          >
            <Icon />
            {label}
          </Link>
        ))}
      </nav>
      <div className="certificate-tab-content" key={[...permissions].sort().join('|')}>
        {section === 'registry' ? (
          <CertificateRegistry />
        ) : section === 'templates' ? (
          <CertificateTemplates
            key={location.pathname + location.search}
            id={id}
            editing={Boolean(match?.[3])}
          />
        ) : section === 'issuers' ? (
          <CertificateIssuers key={location.pathname} id={id} editing={Boolean(match?.[3])} />
        ) : section === 'reviews' ? (
          <CertificateReviews />
        ) : (
          <CertificateTrust />
        )}
      </div>
    </div>
  );
}
