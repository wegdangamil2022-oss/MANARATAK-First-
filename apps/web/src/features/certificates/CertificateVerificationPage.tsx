import { certificateCopy, certificateStatusCopy } from '@manaratak/shared';
import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Award, CheckCircle2, Search, ShieldCheck, XCircle } from 'lucide-react';
import { ApiClient, CertificateVerificationDto } from '../../api/client';
import { Button } from '@manaratak/ui';
import { Seo } from '../../components/Seo';
import { useTranslation } from '../../i18n/I18nProvider';

export function CertificateVerificationPage() {
  const { t, language, dir } = useTranslation();
  const copy = useCallback((value:string) => certificateCopy(language,value), [language]);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const [verificationCode, setVerificationCode] = useState(initialCode);
  const [result, setResult] = useState<CertificateVerificationDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedCode = useMemo(() => verificationCode.trim(), [verificationCode]);
  const verificationRequest = useRef(0);

  const verify = useCallback(
    async (code: string, updateUrl = true) => {
      const request = ++verificationRequest.current;
      const normalized = code.trim();
      if (!normalized) {
        setError(copy("أدخل رمز التحقق من الشهادة."));
        setResult(null);
        return;
      }
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const verification = await ApiClient.verifyCertificate(normalized);
        if (request !== verificationRequest.current) return;
        setResult(verification);
        if (updateUrl) setSearchParams({ code: normalized });
      } catch (err: any) {
        if (request !== verificationRequest.current) return;
        setError(
          err.message === 'Certificate not found'
            ? copy("لم يتم العثور على شهادة بهذا الرمز.")
            : err.message || copy("تعذر التحقق من الشهادة."),
        );
      } finally {
        if (request === verificationRequest.current) setLoading(false);
      }
    },
    [setSearchParams, copy],
  );

  useEffect(() => {
    setVerificationCode(initialCode);
    if (initialCode.trim()) void verify(initialCode, false);
    else {
      ++verificationRequest.current;
      setResult(null);
      setError(null);
      setLoading(false);
    }
    return () => {
      ++verificationRequest.current;
    };
  }, [initialCode, verify]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await verify(normalizedCode);
  };

  return (
    <div dir={dir} className="manaratak-public mn-page-shell min-h-screen">
      <div className="mn-public-container max-w-6xl py-4 sm:py-6">
        <Seo
          title={t('verify_certificate')}
          description={t('verify_issued_manaratak_certificates_using_a_publi')}
        />
        <Link
          to="/"
          className="mb-4 inline-flex min-h-10 items-center text-sm font-semibold text-[var(--mn-secondary)] hover:underline"
        >
          {t('lt_back_to_home_1')}
        </Link>

        <section className="mn-search-hero mb-6 overflow-hidden rounded-3xl border border-[var(--mn-border-gold)] p-5 text-white shadow-xl sm:p-8 md:p-12 mn-inverse">
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <Award className="h-9 w-9 text-[var(--mn-accent-soft)]" />
              <p className="text-sm font-semibold text-[var(--mn-on-dark-muted)]">
                {copy("منصة التحقق من الشهادات")}</p>
            </div>
            <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              {t('verify_a_manaratak_certificate')}
            </h1>
            <p className="text-base leading-8 text-[var(--mn-on-dark-muted)] sm:text-lg">
              {copy("أدخل الرمز المطبوع على الشهادة أو امسح QR للتأكد من سلامة الختم الرقمي وحالة الشهادة لحظيًا.")}</p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <form onSubmit={handleSubmit} className="mn-card space-y-4 rounded-2xl p-5 sm:p-6">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--mn-heading)]">
                  {copy("رمز التحقق من الشهادة")}</span>
                <input
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  placeholder={t('example_mnr_abc123')}
                  className="mn-search-control mt-2 w-full px-4 py-3 font-mono text-left outline-none focus:ring-2 focus:ring-[var(--mn-focus)]"
                />
              </label>
              <Button
                type="submit"
                disabled={loading || !normalizedCode}
                className="w-full bg-[var(--mn-primary)] text-white hover:bg-[var(--mn-primary-hover)]"
              >
                <Search className="ml-2 h-4 w-4" />
                {loading ? copy("جارٍ التحقق...") : copy("تحقق من الشهادة")}
              </Button>
              {error && (
                <div className="rounded-lg border border-[var(--mn-danger-border)] bg-[var(--mn-danger-soft)] p-3 text-sm text-[var(--mn-danger-text)]">
                  {error}
                </div>
              )}
            </form>

            <div className="mn-card-subtle mt-6 rounded-2xl p-5 text-sm text-[var(--mn-text-muted)]">
              <h2 className="mb-2 font-bold text-[var(--mn-heading)]">{copy("الثقة والخصوصية")}</h2>
              <p>
                {copy("يتم فحص الحالة والختم المشفر مباشرة من سجل الشهادات. لا نعرض البريد أو بيانات الاتصال أو أي معلومات طالب خاصة.")}</p>
            </div>
          </div>

          <div className="lg:col-span-2">
            {!result && !loading && (
              <div className="mn-card rounded-2xl border-dashed p-10 text-center text-[var(--mn-text-muted)]">
                {copy("أدخل رمز التحقق لعرض نتيجة موثوقة من سجل الشهادات.")}</div>
            )}

            {loading && (
              <div className="mn-card rounded-2xl p-10 text-center text-[var(--mn-text-muted)]">
                {t('checking_certificate_registry')}
              </div>
            )}

            {result && (
              <div className="mn-card rounded-2xl p-5 sm:p-8">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b pb-6 mb-6">
                  <div>
                    <p className="text-sm text-[var(--mn-text-muted)]">{t('certificate_status')}</p>
                    <h2 className="text-3xl font-bold mt-1">
                      {result.isValid ? copy("شهادة صحيحة وموثقة") : copy("الشهادة غير صالحة")}
                    </h2>
                  </div>
                  <span
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${result.isValid ? 'border border-[var(--mn-success-border)] bg-[var(--mn-success-soft)] text-[var(--mn-success-text)]' : 'border border-[var(--mn-danger-border)] bg-[var(--mn-danger-soft)] text-[var(--mn-danger-text)]'}`}
                  >
                    {result.isValid ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {certificateStatusCopy(language,result.status)}
                  </span>
                </div>

                {result.verificationFailure ? <p role="status" className="mb-4 rounded-lg border p-3">{copy(result.verificationFailure === 'REVALIDATION_REQUIRED' ? 'تحتاج الشهادة إلى إعادة تحقق معتمدة قبل استخدامها.' : 'تعذر إثبات سلامة الشهادة؛ لم تُعرض بياناتها.')}</p> : null}
                {result.integrityVerified ? <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Info
                    label={copy("الدورة أو البرنامج")}
                    value={
                      result.achievementDisplayName ||
                      result.courseDisplayName ||
                      result.learningPathDisplayName ||
                      copy("غير متاح")
                    }
                  />
                  <Info
                    label={copy("صاحب الشهادة")}
                    value={result.recipientDisplayName || copy("مرجع طالب محمي")}
                  />
                  <Info label={copy("رقم الشهادة")} value={result.serialNumber} />
                  <Info label={copy("الجهة المصدرة")} value={result.issuerName || 'MANARATAK'} />
                  <Info label={copy("تاريخ الإصدار")} value={formatDate(result.issuedAt, language)} />
                  <Info label={copy("تاريخ الإكمال")} value={formatDate(result.completedAt, language)} />
                  <Info
                    label={copy("صلاحية الشهادة")}
                    value={
                      result.validityPolicy === 'PERMANENT'
                        ? copy("دائمة")
                        : result.validityPolicy === 'RENEWABLE'
                          ? copy("قابلة للتجديد")
                          : copy("محددة المدة")
                    }
                  />
                  <Info
                    label={copy("تاريخ الانتهاء")}
                    value={result.expiresAt ? formatDate(result.expiresAt, language) : copy("لا يوجد تاريخ انتهاء")}
                  />
                </div> : <p role="alert">{copy("تعذر إثبات بيانات الشهادة؛ لا تُعرض ادعاءات غير موثوقة.")}</p>}

                {result.verificationFailure ? <p role="status" className="mb-4 rounded-lg border p-3">{copy(result.verificationFailure === 'REVALIDATION_REQUIRED' ? 'تحتاج الشهادة إلى إعادة تحقق معتمدة قبل استخدامها.' : 'تعذر إثبات سلامة الشهادة؛ لم تُعرض بياناتها.')}</p> : null}
                {result.integrityVerified ? <div className="mt-6 rounded-xl border border-[var(--mn-border-gold)] bg-[var(--mn-gold-surface)] p-4 text-sm leading-7 text-[var(--mn-text)]">
                  {copy("هذه")}<strong>{copy("شهادة إتمام رقمية صادرة من منصة منارتك")}</strong> {copy("لإثبات إكمال متطلبات التعلم المحددة. لا تمثل درجة جامعية أو اعتمادًا مهنيًا خارجيًا ما لم تظهر جهة اعتماد مستقلة صراحة ضمن بيانات الشهادة.")}</div> : null}

                <div
                  className={`mt-6 flex items-center gap-3 rounded-xl border p-4 ${result.integrityVerified ? 'border-[var(--mn-success-border)] bg-[var(--mn-success-soft)] text-[var(--mn-success-text)]' : 'border-[var(--mn-danger-border)] bg-[var(--mn-danger-soft)] text-[var(--mn-danger-text)]'}`}
                >
                  <ShieldCheck className="h-6 w-6" />
                  <div>
                    <strong className="block">
                      {result.integrityVerified ? copy("الختم الرقمي سليم") : copy("تعذر إثبات سلامة الختم")}
                    </strong>
                    <span className="text-xs">
                      {copy("تمت مقارنة البيانات المختومة مع البصمة المشفرة المحفوظة في سجل الشهادات.")}</span>
                  </div>
                </div>

                {result.skills.length ? (
                  <div className="mt-6">
                    <h3 className="mb-2 text-sm font-bold">{copy("المهارات المثبتة")}</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-[var(--mn-success-border)] bg-[var(--mn-success-soft)] px-3 py-1 text-xs font-semibold text-[var(--mn-success-text)]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {result.revokedAt && (
                  <div className="mt-6 rounded-xl border border-[var(--mn-danger-border)] bg-[var(--mn-danger-soft)] p-4">
                    <h3 className="font-bold text-[var(--mn-danger-text)]">
                      {t('revocation_details')}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--mn-danger-text)]">
                      {t('revoked_at')} {formatDate(result.revokedAt, language)}{copy(". لم تعد هذه الشهادة صالحة للتحقق.")}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mn-card-subtle rounded-xl p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mn-text-muted)]">
        {label}
      </p>
      <p className="mt-1 break-words font-medium text-[var(--mn-heading)]">{value}</p>
    </div>
  );
}

function formatDate(value: string | null | undefined, language:'ar'|'en' = 'ar'): string {
  if (!value || !Number.isFinite(new Date(value).getTime())) return language === 'ar' ? 'غير متاح' : 'Not available';
  return new Intl.DateTimeFormat(language, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(value));
}
