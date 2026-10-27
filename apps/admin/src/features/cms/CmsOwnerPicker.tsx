import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { adminApiClient } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { messageOf } from './cmsModels';

const owners: Record<string, { path: string; search: string; permission: string }> = {
  UNIVERSITY: {
    path: '/admin/universities',
    search: 'search',
    permission: 'admin:universities:manage',
  },
  SCHOLARSHIP: {
    path: '/admin/scholarships',
    search: 'query',
    permission: 'admin:scholarships:manage',
  },
  MAJOR: { path: '/admin/majors', search: 'search', permission: 'admin:majors:manage' },
  COURSE: { path: '/admin/courses', search: 'search', permission: 'admin:courses:manage' },
  INTERNATIONAL_TEST: {
    path: '/admin/international-tests',
    search: 'search',
    permission: 'admin:international-tests:manage',
  },
  CMS_CONTENT: { path: '/admin/cms/content', search: 'q', permission: 'admin:cms:view' },
};
interface RecordOption {
  id: string;
  displayName?: string;
  title?: string;
  canonicalName?: string;
  localizedNameAr?: string;
  localizedNameEn?: string;
  publicId?: string;
}
export function CmsOwnerPicker({
  type,
  value,
  disabled,
  onChange,
}: {
  type: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const { language } = useTranslation(),
    ar = language === 'ar',
    { hasPermission } = useAdminAuthorization();
  const config = owners[type];
  const allowed = Boolean(config && hasPermission(config.permission));
  const [query, setQuery] = useState(''),
    [page, setPage] = useState(1),
    [open, setOpen] = useState(false);
  const [data, setData] = useState<{ data: RecordOption[]; totalPages: number } | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setQuery('');
    setPage(1);
    setOpen(false);
    setData(null);
  }, [type]);
  useEffect(() => {
    if (!open || !config || !allowed) return;
    let active = true;
    setBusy(true);
    setError('');
    setData(null);
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (query.trim()) params.set(config.search, query.trim());
      adminApiClient
        .request<{ data: RecordOption[]; totalPages: number }>(config.path + '?' + params)
        .then((result) => {
          if (active) setData(result);
        })
        .catch((reason) => {
          if (active) setError(messageOf(reason, language));
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [type, query, page, open, config, language, allowed]);
  if (!config)
    return (
      <label>
        {ar ? 'معرّف المالك الموثق — ربط متقدم' : 'Verified owner ID — advanced relationship'}
        <input
          dir="ltr"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <small>
          {ar
            ? 'منتقي هذا النوع غير متاح بعقد بحث مستقل. استخدم المعرّف الفعلي من القسم المالك.'
            : 'This owner has no independent lookup contract. Use its verified canonical ID.'}
        </small>
      </label>
    );
  return (
    <div className="cms-owner-picker">
      <button
        type="button"
        disabled={disabled || !hasPermission(config.permission)}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Search size={16} />
        {ar
          ? value
            ? 'تغيير السجل المرتبط'
            : 'اختيار السجل من المصدر'
          : value
            ? 'Change linked record'
            : 'Choose from owner records'}
      </button>
      {value && <small dir="ltr">{value}</small>}
      {!hasPermission(config.permission) && (
        <small>
          {ar
            ? 'قراءة أسماء السجلات تحتاج صلاحية القسم المالك.'
            : 'Owner permission is required to look up record names.'}
        </small>
      )}
      {open && (
        <div className="cms-owner-results">
          <label>
            {ar ? 'البحث في القسم المالك' : 'Search owner records'}
            <input
              maxLength={200}
              value={query}
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
            />
          </label>
          {busy ? (
            <p role="status">{ar ? 'جارٍ البحث…' : 'Searching…'}</p>
          ) : error ? (
            <p role="alert">{error}</p>
          ) : (
            <>
              <div>
                {data?.data.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onChange(item.id);
                      setOpen(false);
                    }}
                  >
                    {(ar ? item.localizedNameAr : item.localizedNameEn) ||
                      item.displayName ||
                      item.title ||
                      item.canonicalName ||
                      item.publicId ||
                      item.id}
                  </button>
                ))}
              </div>
              {data?.data.length === 0 && <p>{ar ? 'لا توجد نتائج.' : 'No results.'}</p>}
            </>
          )}
          <div className="cms-actions">
            <button type="button" disabled={busy || page <= 1} onClick={() => setPage(page - 1)}>
              {ar ? 'السابق' : 'Previous'}
            </button>
            <span>{page}</span>
            <button
              type="button"
              disabled={busy || !data || page >= data.totalPages || page >= 500}
              onClick={() => setPage(page + 1)}
            >
              {ar ? 'التالي' : 'Next'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
