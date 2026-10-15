import { validTestDiscoveryHref } from '../TestDiscoveryContract';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiClient } from '../../../api/client';
import { useTranslation } from '../../../i18n/I18nProvider';
type Owner = 'STUDENT_TOOLS' | 'SERVICES';
export function TestOwnerDiscovery({ slug }: { slug: string }) {
  const { language } = useTranslation(),
    en = language === 'en';
  return (
    <section className="my-4 border rounded-xl p-4">
      <h3>{en ? 'Related student tools and services' : 'أدوات وخدمات مرتبطة بالاختبار'}</h3>
      <p>
        {en
          ? 'Reviewed links are optional guidance. They do not establish eligibility or book or pay for a service.'
          : 'روابط معتمدة للإرشاد الاختياري؛ لا تثبت الأهلية ولا تحجز خدمة أو تدفع مقابلها.'}
      </p>
      {(['STUDENT_TOOLS', 'SERVICES'] as const).map((owner) => (
        <DiscoveryPage key={`${slug}:${owner}:${language}`} slug={slug} owner={owner} />
      ))}
    </section>
  );
}
function DiscoveryPage({ slug, owner }: { slug: string; owner: Owner }) {
  const { language } = useTranslation(),
    en = language === 'en';
  const [after, setAfter] = useState<string | undefined>(),
    [page, setPage] = useState<Awaited<
      ReturnType<typeof ApiClient.getInternationalTestDiscovery>
    > | null>(null),
    [error, setError] = useState(false),
    [refresh, setRefresh] = useState(0),
    [loading, setLoading] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    setPage(null);
    setError(false);
    setLoading(true);
    void ApiClient.getInternationalTestDiscovery(
      slug,
      owner,
      language === 'en' ? 'en' : 'ar',
      after,
    )
      .then((result) => {
        if (current !== generation.current) return;
        if (
          result.ownerDomain !== owner ||
          !['AVAILABLE', 'EMPTY', 'UNAVAILABLE'].includes(result.state) ||
          !Array.isArray(result.data)
        )
          throw new Error('INVALID_DISCOVERY_PAGE');
        setPage(result);
      })
      .catch(() => {
        if (current === generation.current) setError(true);
      })
      .finally(() => {
        if (current === generation.current) setLoading(false);
      });
    return () => {
      ++generation.current;
    };
  }, [slug, owner, language, after, refresh]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reload = () => {
      if (document.visibilityState !== 'hidden') setRefresh(value => value + 1);
    };
    const timer = window.setInterval(reload, 30000);
    window.addEventListener('focus', reload);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', reload); };
  }, [slug, owner, language]);
  return (
    <div className="my-3">
      <h4>
        {owner === 'STUDENT_TOOLS'
          ? en
            ? 'Student tools'
            : 'أدوات الطالب'
          : en
            ? 'Services'
            : 'الخدمات'}
      </h4>
      {loading && <p role="status">{en ? 'Loading…' : 'جارٍ القراءة…'}</p>}
      {(error || page?.state === 'UNAVAILABLE') && (
        <p role="alert">{en ? 'Owner links are unavailable.' : 'روابط المالك غير متاحة.'}</p>
      )}
      {page?.state === 'EMPTY' && (
        <p>{en ? 'No current reviewed links.' : 'لا توجد روابط معتمدة حالية.'}</p>
      )}
      <ul>
        {page?.data.map((row) => (
          <li key={row.publicId}>
            {validTestDiscoveryHref(row.href, owner) ? (
              <Link to={row.href}>{row.displayName}</Link>
            ) : (
              row.displayName
            )}
            {row.requiresSignIn && <span> — {en ? 'Sign in required' : 'يتطلب تسجيل الدخول'}</span>}
            {row.fulfillmentPolicy && (
              <span>
                {' '}
                —{' '}
                {row.fulfillmentPolicy === 'FREE'
                  ? en
                    ? 'Free'
                    : 'مجانية'
                  : row.fulfillmentPolicy === 'CHARGEABLE'
                    ? en
                      ? 'Paid service'
                      : 'خدمة مدفوعة'
                    : en
                      ? 'Quotation required'
                      : 'تحتاج عرض سعر'}
              </span>
            )}
          </li>
        ))}
      </ul>
      {page?.hasMore && (
        <p>
          {en
            ? 'More approved links may be on the next page.'
            : 'قد توجد روابط معتمدة إضافية في الصفحة التالية.'}
        </p>
      )}
      <button type="button" disabled={loading} onClick={() => setRefresh((v) => v + 1)}>
        {en ? 'Refresh' : 'تحديث'}
      </button>
      <button type="button" disabled={loading || !after} onClick={() => setAfter(undefined)}>
        {en ? 'First page' : 'الأولى'}
      </button>
      <button
        type="button"
        disabled={loading || !page?.hasMore || !page.nextCursor}
        onClick={() => setAfter(page?.nextCursor ?? undefined)}
      >
        {en ? 'Next' : 'التالي'}
      </button>
    </div>
  );
}
