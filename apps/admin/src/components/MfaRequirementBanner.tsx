import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n/I18nProvider';
export function MfaRequirementBanner() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  useEffect(() => {
    const listener = (event: Event) => {
      const value = (event as CustomEvent<{ code?: string }>).detail?.code;
      if (value === 'MFA_ENROLLMENT_REQUIRED' || value === 'MFA_STEP_UP_REQUIRED') setCode(value);
    };
    window.addEventListener('absheer-admin-mfa-required', listener);
    return () => window.removeEventListener('absheer-admin-mfa-required', listener);
  }, []);
  if (!code) return null;
  return (
    <aside role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p>
        {t(
          code === 'MFA_ENROLLMENT_REQUIRED'
            ? 'mfa_enrollment_required'
            : 'mfa_confirmation_required',
        )}
      </p>
      <Link
        className="underline"
        target="_blank"
        rel="noopener noreferrer"
        to="/security"
        onClick={() => setCode('')}
      >
        {t('mfa_title')}
      </Link>
    </aside>
  );
}
