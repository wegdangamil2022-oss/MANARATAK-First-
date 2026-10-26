import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Database,
  Globe2,
  Coins,
  Languages,
  MapPinned,
  Building2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import type { ReferenceDataCollection } from '@manaratak/domain';
import { referenceDataAdminApi } from '../api/referenceData';
import { ReferenceQualityWorkspace } from '../components/ReferenceQualityWorkspace';
import { ReferenceImportReviewQueue } from '../components/ReferenceImportReviewQueue';
import { ReferenceOwnerReviewWorkspace } from '../components/ReferenceOwnerReviewWorkspace';
import { useTranslation } from '../i18n/I18nProvider';
import { ReferenceRecordWorkspace } from '../features/reference-data/ReferenceRecordWorkspace';
import { ReferenceSourcePreviews } from '../features/reference-data/ReferenceSourcePreviews';
import {
  referenceDefinitions,
  referenceSection,
} from '../features/reference-data/referenceWorkspaceModel';
import '../features/reference-data/reference-data.css';
const entries = ['countries', 'currencies', 'languages', 'regions', 'cities', 'quality'] as const;
const icons = {
  countries: Globe2,
  currencies: Coins,
  languages: Languages,
  regions: MapPinned,
  cities: Building2,
  quality: ShieldCheck,
};
export function ReferenceDataAdminPage() {
  const { language } = useTranslation(),
    isAr = language === 'ar',
    [params, setParams] = useSearchParams(),
    section = referenceSection(params);
  const [quality, setQuality] = useState<Awaited<
      ReturnType<typeof referenceDataAdminApi.qualitySnapshot>
    > | null>(null),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0),
    [qualityTab, setQualityTab] = useState('report'),
    [receipt, setReceipt] = useState<string>();
  const [standards, setStandards] = useState<Awaited<
      ReturnType<typeof referenceDataAdminApi.standardsReadiness>
    > | null>(null),
    [standardsError, setStandardsError] = useState('');
  useEffect(() => {
    let live = true;
    setError('');
    setQuality(null);
    referenceDataAdminApi
      .qualitySnapshot()
      .then((value) => {
        if (live) setQuality(value);
      })
      .catch((cause) => {
        if (live) setError(cause instanceof Error ? cause.message : 'QUALITY_SNAPSHOT_UNAVAILABLE');
      });
    return () => {
      live = false;
    };
  }, [revision]);
  useEffect(() => {
    if (section !== 'quality' || qualityTab !== 'standards') return;
    let live = true;
    setStandards(null);
    setStandardsError('');
    referenceDataAdminApi
      .standardsReadiness()
      .then((value) => {
        if (live) setStandards(value);
      })
      .catch((cause) => {
        if (live)
          setStandardsError(cause instanceof Error ? cause.message : 'STANDARDS_UNAVAILABLE');
      });
    return () => {
      live = false;
    };
  }, [section, qualityTab, revision]);
  const navigate = (next: ReferenceDataCollection | 'quality' | 'home') => {
    const url = new URLSearchParams();
    if (next !== 'home' && next !== 'quality') {
      try {
        const saved = sessionStorage.getItem('reference-state:' + next);
        if (saved) for (const [key, value] of new URLSearchParams(saved)) url.set(key, value);
      } catch {
        /* URL operation does not depend on browser storage. */
      }
      url.set('p7Tab', next);
    }
    url.set('section', next);
    setParams(url);
  };
  return (
    <div className="reference-workspace" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="reference-hero">
        <div>
          <span>
            <Database /> MANARATAK
          </span>
          <h1>{isAr ? 'إدارة البيانات المرجعية' : 'Reference data administration'}</h1>
          <p>
            {isAr
              ? 'هويات موحدة للدول والعملات واللغات والمناطق والمدن، مع مصادرها وحوكمتها.'
              : 'Canonical countries, currencies, languages, regions and cities with source governance.'}
          </p>
        </div>
        <div className="reference-actions">
          <button onClick={() => setRevision((x) => x + 1)}>
            <RefreshCw />
            {isAr ? 'تحديث البيانات' : 'Refresh data'}
          </button>
          <button onClick={() => navigate('quality')}>
            <ShieldCheck />
            {isAr ? 'الجودة والمصادر' : 'Quality and sources'}
          </button>
        </div>
      </header>
      <nav
        className="reference-main-nav"
        aria-label={isAr ? 'مساحات البيانات المرجعية' : 'Reference workspaces'}
      >
        <button
          aria-current={section === 'home' ? 'page' : undefined}
          onClick={() => navigate('home')}
        >
          {isAr ? 'الرئيسية' : 'Overview'}
        </button>
        {entries.map((entry) => {
          const Icon = icons[entry];
          return (
            <button
              key={entry}
              aria-current={section === entry ? 'page' : undefined}
              onClick={() => navigate(entry)}
            >
              <Icon />
              {entry === 'quality'
                ? isAr
                  ? 'الجودة والحوكمة'
                  : 'Quality and governance'
                : referenceDefinitions[entry].label[isAr ? 0 : 1]}
            </button>
          );
        })}
      </nav>
      {section === 'home' && (
        <>
          <section
            className="reference-entry-grid"
            aria-label={isAr ? 'أقسام البيانات المرجعية' : 'Reference data areas'}
          >
            {entries.map((entry) => {
              const Icon = icons[entry],
                metric =
                  entry === 'quality'
                    ? undefined
                    : quality?.data.find((item) => item.collection === entry);
              return (
                <button key={entry} onClick={() => navigate(entry)}>
                  <Icon aria-hidden="true" />
                  <div>
                    <h2>
                      {entry === 'quality'
                        ? isAr
                          ? 'الجودة والحوكمة'
                          : 'Quality and governance'
                        : referenceDefinitions[entry].label[isAr ? 0 : 1]}
                    </h2>
                    <small>
                      {entry === 'quality'
                        ? isAr
                          ? 'المصادر والموافقات والأثر'
                          : 'Sources, approvals and impact'
                        : referenceDefinitions[entry].description[isAr ? 0 : 1]}
                    </small>
                    {entry !== 'quality' && (
                      <>
                        <strong>{metric ? `${metric.active} / ${metric.total}` : '—'}</strong>
                        <small>
                          {isAr ? 'نشط / إجمالي من المصدر' : 'Active / total from owner'}
                        </small>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </section>
          {error && (
            <p role="alert" className="reference-error">
              {isAr ? 'المؤشرات غير متاحة، وليست صفرًا. ' : 'Metrics unavailable, not zero. '}
              {error}
            </p>
          )}
          {!quality && !error && (
            <p role="status">
              {isAr ? 'جارٍ قراءة الأعداد المرجعية…' : 'Loading reference counts…'}
            </p>
          )}
          {quality && (
            <p className="reference-notice">
              {isAr
                ? 'نطاق الأعداد: جميع سجلات المالك. وقت القراءة:'
                : 'Count scope: all owner records. Read at:'}{' '}
              {new Date(quality.asOf).toLocaleString(language)}.{' '}
              {isAr
                ? 'تغطية المصدر والأسماء البديلة والعلاقات: غير مثبتة.'
                : 'Source, alias and dependency coverage: unverified.'}
            </p>
          )}
          <section className="reference-content-card">
            <h2>{isAr ? 'سجلات تحتاج انتباهك' : 'Records needing attention'}</h2>
            <p>
              {isAr
                ? 'افتح تقرير الجودة لقراءة المشكلات الفعلية وأنواعها التسعة؛ لا يُستنتج اعتماد المصدر من اكتمال الحقول.'
                : 'Open quality issues for the nine supported issue types; populated fields do not prove source approval.'}
            </p>
            <button
              onClick={() => {
                setQualityTab('report');
                navigate('quality');
              }}
            >
              {isAr ? 'فتح تقرير الجودة' : 'Open quality report'}
            </button>
          </section>
        </>
      )}
      {section !== 'home' && section !== 'quality' && (
        <ReferenceRecordWorkspace
          key={section}
          collection={section}
          isAr={isAr}
          onNavigate={navigate}
        />
      )}
      {section === 'quality' && (
        <section className="reference-record-workspace">
          <header className="reference-subheader">
            <h2>{isAr ? 'الجودة والمصادر والحوكمة' : 'Quality, sources and governance'}</h2>
          </header>
          <nav className="reference-detail-tabs">
            {[
              ['report', 'تقارير الجودة', 'Quality issues'],
              ['imports', 'فحص الاستيراد P6 → P7', 'P6 → P7 screening'],
              ['owner', 'موافقات المالك والمعايير', 'Owner decisions and snapshots'],
              ['standards', 'حالة المعايير', 'Standards readiness'],
              ['preview', 'معاينة ملفات المصادر', 'Source file previews'],
            ].map(([key, ar, en]) => (
              <button
                key={key}
                aria-current={qualityTab === key ? 'page' : undefined}
                onClick={() => setQualityTab(key)}
              >
                {isAr ? ar : en}
              </button>
            ))}
          </nav>
          {qualityTab === 'report' && <ReferenceQualityWorkspace />}
          {qualityTab === 'imports' && (
            <ReferenceImportReviewQueue
              onSelectReceipt={(id) => {
                setReceipt(id);
                setQualityTab('owner');
              }}
            />
          )}
          {qualityTab === 'owner' && <ReferenceOwnerReviewWorkspace receiptId={receipt} />}
          {qualityTab === 'preview' && <ReferenceSourcePreviews isAr={isAr} />}
          {qualityTab === 'standards' && (
            <section className="reference-content-card">
              <h3>{isAr ? 'أدلة نسخ المعايير الرسمية' : 'Official standards snapshot evidence'}</h3>
              {standardsError && <p role="alert">{standardsError}</p>}
              {!standards && !standardsError && (
                <p role="status">{isAr ? 'جارٍ قراءة سجل المصادر…' : 'Loading source registry…'}</p>
              )}
              {standards && (
                <>
                  <p>
                    {isAr ? 'وقت القراءة' : 'Read at'}:{' '}
                    {new Date(standards.asOf).toLocaleString(language)}
                  </p>
                  <div className="reference-card-grid">
                    {standards.data.map((item) => (
                      <article key={item.standardFamily}>
                        <h3 dir="ltr">{item.standardFamily}</h3>
                        <p>
                          {item.readiness === 'EVIDENCE_RECORDED'
                            ? item.sourceVersion
                            : isAr
                              ? 'لم تثبت نسخة معتمدة'
                              : 'No approved snapshot evidenced'}
                        </p>
                        <small>
                          {isAr ? 'نسخ مرشحة' : 'Candidate snapshots'}:{' '}
                          {item.candidateVersions.join(' · ') || '—'}
                        </small>
                      </article>
                    ))}
                  </div>
                  <p className="reference-notice">
                    {isAr
                      ? 'صحة الصيغة واقتراحات ICU لا تثبت اعتماد ISO أو IANA أو CLDR.'
                      : 'Syntax checks and ICU suggestions do not prove ISO, IANA or CLDR approval.'}
                  </p>
                </>
              )}
            </section>
          )}
        </section>
      )}
    </div>
  );
}
