import { useState } from 'react';
import { ADMIN_PERMISSION_CATALOG } from '@manaratak/shared';
import { useTranslation } from '../i18n/I18nProvider';
export function AuthorizationPermissionCatalog({ permissions }: { permissions: string[] }) {
  const { t, language } = useTranslation();
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('');
  const [risk, setRisk] = useState('');
  const available = ADMIN_PERMISSION_CATALOG.filter((entry) => permissions.includes(entry.key));
  const visible = available.filter(
    (entry) =>
      (!domain || entry.domain === domain) &&
      (!risk || entry.risk === risk) &&
      [entry.key, entry.labelAr, entry.labelEn, entry.descriptionAr, entry.descriptionEn].some(
        (value) => value.toLowerCase().includes(search.trim().toLowerCase()),
      ),
  );
  return (
    <section
      className="rounded-2xl border bg-white p-4 space-y-3"
      aria-labelledby="iam-catalog-title"
    >
      <h2 id="iam-catalog-title" className="font-bold">
        {t('iam_workspace_2')}
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          {t('iam_search')}
          <input
            className="w-full border p-2"
            value={search}
            maxLength={240}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          {t('iam_permission_domain')}
          <select
            className="w-full border p-2"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          >
            <option value="">{t('iam_all')}</option>
            {[...new Set(available.map((entry) => entry.domain))].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('iam_permission_risk')}
          <select
            className="w-full border p-2"
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
          >
            <option value="">{t('iam_all')}</option>
            {['STANDARD', 'HIGH', 'CRITICAL'].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!visible.length && <p>{t('iam_empty')}</p>}
      <ul className="grid gap-3 md:grid-cols-2">
        {visible.map((entry) => (
          <li key={entry.key} className="rounded-xl border p-3">
            <h3 className="font-bold">{language === 'ar' ? entry.labelAr : entry.labelEn}</h3>
            <p>{language === 'ar' ? entry.descriptionAr : entry.descriptionEn}</p>
            <p>
              {entry.domain} / {entry.action} · {entry.risk}
            </p>
            <code>{entry.key}</code>
          </li>
        ))}
      </ul>
    </section>
  );
}
