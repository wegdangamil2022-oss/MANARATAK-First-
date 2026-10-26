import { useState } from 'react';
import { readXlsxWorkbook, spreadsheetRowsToObjects } from '@manaratak/shared';
import { Upload } from 'lucide-react';
import { referenceDataAdminApi } from '../../api/referenceData';
type CountryPreview = {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  reviewRequiredRecords: number;
  databaseWrites: number;
};
type Candidate = {
  code: string;
  suggestedDisplayName?: string;
  usageCount: number;
  countryIso2Codes: string[];
};
type DerivedPreview = { currencies: Candidate[]; languages: Candidate[]; databaseWrites: number };
export function ReferenceSourcePreviews({ isAr }: { isAr: boolean }) {
  const [kind, setKind] = useState<'countries' | 'currencies' | 'languages'>('countries'),
    [result, setResult] = useState<CountryPreview | DerivedPreview | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const preview = async (file?: File) => {
    if (!file || busy) return;
    setResult(null);
    setBusy(true);
    setError('');
    try {
      if (file.size > 8 * 1024 * 1024)
        throw Error(isAr ? 'الحد الأقصى للملف 8 MiB.' : 'File limit: 8 MiB.');
      const bytes = new Uint8Array(await file.arrayBuffer()),
        workbook = await readXlsxWorkbook(bytes),
        sheet = workbook.sheets.get('Countries');
      if (!sheet) throw Error('COUNTRIES_SHEET_REQUIRED');
      const records = spreadsheetRowsToObjects<Record<string, unknown>>(sheet, {
        defaultValue: null,
        raw: false,
      });
      if (!records.length || records.length > 500)
        throw Error(
          isAr
            ? 'المعاينة تقبل من 1 إلى 500 سجل؛ لم يختصر الملف تلقائيًا.'
            : 'Preview accepts 1–500 rows; the file was not truncated.',
        );
      if (kind === 'countries') {
        const digest = await crypto.subtle.digest('SHA-256', bytes),
          sha256 = Array.from(new Uint8Array(digest))
            .map((x) => x.toString(16).padStart(2, '0'))
            .join('');
        setResult(
          await referenceDataAdminApi.previewCountries<CountryPreview>({
            sourceName: file.name,
            sourceVersion: sha256.slice(0, 16),
            sha256,
            records,
          }),
        );
      } else
        setResult(await referenceDataAdminApi.previewDerivedReferences<DerivedPreview>(records));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'PREVIEW_FAILED');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="reference-content-card">
      <h2>{isAr ? 'معاينة مصادر Countries.xlsx' : 'Countries.xlsx source preview'}</h2>
      <p className="reference-notice">
        {isAr
          ? 'فحص ومعاينة فقط؛ لا اعتماد أو ترقية أو كتابة إلى قاعدة البيانات.'
          : 'Preflight only; no approval, promotion or database write.'}
      </p>
      <div className="reference-actions">
        <label>
          {isAr ? 'نوع المعاينة' : 'Preview type'}
          <select
            disabled={busy}
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as typeof kind);
              setResult(null);
            }}
          >
            <option value="countries">{isAr ? 'الدول' : 'Countries'}</option>
            <option value="currencies">{isAr ? 'مشتقات العملات' : 'Currency candidates'}</option>
            <option value="languages">{isAr ? 'مشتقات اللغات' : 'Language candidates'}</option>
          </select>
        </label>
        <label className="reference-button">
          <Upload />
          {isAr ? 'اختيار ملف' : 'Choose file'}
          <input
            type="file"
            disabled={busy}
            accept=".xlsx"
            className="sr-only"
            onChange={(e) => void preview(e.target.files?.[0])}
          />
        </label>
      </div>
      {busy && <p role="status">{isAr ? 'جارٍ فحص المصدر…' : 'Checking source…'}</p>}
      {error && <p role="alert">{error}</p>}
      {result && (
        <>
          <p>
            {isAr ? 'عمليات الكتابة في هذه المعاينة' : 'Database writes in this preview'}:{' '}
            {result.databaseWrites}
          </p>
          {'totalRecords' in result ? (
            <dl className="reference-metrics">
              {[
                ['السجلات', 'Records', result.totalRecords],
                ['صحيح', 'Valid', result.validRecords],
                ['غير صحيح', 'Invalid', result.invalidRecords],
                ['يحتاج مراجعة', 'Needs review', result.reviewRequiredRecords],
              ].map(([ar, en, value]) => (
                <div key={String(en)}>
                  <dt>{isAr ? ar : en}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="reference-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{isAr ? 'الرمز' : 'Code'}</th>
                    <th>{isAr ? 'عرض مقترح من المصدر' : 'Source-suggested display'}</th>
                    <th>{isAr ? 'الاستخدام' : 'Usage'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(kind === 'currencies' ? result.currencies : result.languages).map((item) => (
                    <tr key={item.code}>
                      <td dir="ltr">{item.code}</td>
                      <td>{item.suggestedDisplayName || '—'}</td>
                      <td>{item.usageCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
