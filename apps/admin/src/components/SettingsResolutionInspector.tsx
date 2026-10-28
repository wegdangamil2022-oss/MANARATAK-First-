import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ResolvedSetting } from '@manaratak/domain';
import { adminApiClient } from '../api/client';
import { ADMIN_PERMISSION_CATALOG } from '@manaratak/shared';
import { SettingsIdentityScopePicker } from './SettingsIdentityScopePicker';
import { settingsOperationError } from '../features/settings/settingsModel';

const domains = [...new Set(ADMIN_PERMISSION_CATALOG.map((entry) => entry.domain))].sort();

function display(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text === undefined ? '—' : text.length > 1000 ? `${text.slice(0, 1000)}…` : text;
}

export function SettingsResolutionInspector({
  definitions,
  isAr,
  initialKey = '',
}: {
  definitions: Array<{ key: string }>;
  isAr: boolean;
  initialKey?: string;
}) {
  const [key, setKey] = useState(initialKey);
  const [domainId, setDomainId] = useState('');
  const [identityId, setIdentityId] = useState('');
  const [withIdentity, setWithIdentity] = useState(false);
  const [result, setResult] = useState<ResolvedSetting | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    setKey(initialKey);
    setResult(null);
    setError('');
    setLoading(false);
  }, [initialKey]);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const invalidate = () => {
    generation.current++;
    setResult(null);
    setError('');
    setLoading(false);
  };
  const inspect = async (event: FormEvent) => {
    event.preventDefault();
    if (!key) return;
    const current = ++generation.current;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const params = new URLSearchParams();
      if (domainId.trim()) params.set('domainId', domainId.trim());
      if (identityId.trim()) params.set('identityId', identityId.trim());
      const response = await adminApiClient.request<{ data: ResolvedSetting }>(
        `/settings/inspect/${encodeURIComponent(key)}?${params}`,
        { cache: 'no-store' },
      );
      if (current === generation.current) setResult(response.data);
    } catch (cause) {
      if (current === generation.current) setError(settingsOperationError(cause, isAr));
    } finally {
      if (current === generation.current) setLoading(false);
    }
  };
  return (
    <section
      className="rounded-2xl border bg-white p-5 space-y-3"
      aria-label={isAr ? 'القيمة الفعالة للإعداد' : 'Effective setting'}
    >
      <h2 className="font-bold">
        {isAr ? 'القيمة الفعالة ومصدرها' : 'Effective value and source'}
      </h2>
      <form onSubmit={(event) => void inspect(event)} className="grid gap-3 md:grid-cols-4">
        <input
          aria-label={isAr ? 'مفتاح الإعداد للتحقق' : 'Setting to inspect'}
          list="settings-inspector-keys"
          value={key}
          onChange={(event) => {
            invalidate();
            setKey(event.target.value);
          }}
          className="input"
          required
          maxLength={200}
        />
        <datalist id="settings-inspector-keys">
          {definitions.map((definition) => (
            <option key={definition.key} value={definition.key} />
          ))}
        </datalist>
        <select
          aria-label={isAr ? 'نطاق المجال للتحقق' : 'Domain context'}
          value={domainId}
          onChange={(event) => {
            invalidate();
            setDomainId(event.target.value);
          }}
        >
          <option value="">{isAr ? 'عام · دون مجال' : 'Global · no domain'}</option>
          {domains.map((domain) => (
            <option key={domain}>{domain}</option>
          ))}
        </select>
        <label>
          <input
            type="checkbox"
            checked={withIdentity}
            onChange={(event) => {
              invalidate();
              setWithIdentity(event.target.checked);
              setIdentityId('');
            }}
          />
          {isAr ? 'فحص لهوية محددة' : 'Inspect for an identity'}
        </label>
        {withIdentity && (
          <SettingsIdentityScopePicker
            value={identityId}
            onChange={(value) => {
              invalidate();
              setIdentityId(value);
            }}
            isAr={isAr}
            disabled={loading}
          />
        )}
        <button
          type="submit"
          disabled={!key.trim() || loading || (withIdentity && !identityId)}
          className="settings-primary"
        >
          {loading
            ? isAr
              ? 'جاري التحقق…'
              : 'Resolving…'
            : isAr
              ? 'عرض القيمة الفعالة'
              : 'Inspect effective value'}
        </button>
        <button
          type="button"
          onClick={() => {
            invalidate();
            setKey('');
            setDomainId('');
            setIdentityId('');
            setWithIdentity(false);
          }}
        >
          {isAr ? 'مسح الفحص' : 'Reset inspection'}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {result && (
        <div aria-live="polite" className="space-y-2 text-sm">
          <p>
            {isAr ? 'النتيجة' : 'Status'}: <code>{result.status}</code>
          </p>
          {result.status === 'RESOLVED' && (
            <>
              <p>
                {isAr ? 'القيمة' : 'Value'}:{' '}
                <code className="break-all">{display(result.value)}</code>
              </p>
              <p>
                {isAr ? 'المصدر' : 'Source'}: {result.sourceScope}
                {result.sourceScopeId ? `: ${result.sourceScopeId}` : ''}
                {result.versionId ? ` · ${result.versionId}` : ''}
              </p>
              <ol className="list-inside list-decimal space-y-1">
                {result.chain.map((step) => (
                  <li key={step.scope}>
                    {step.scope}
                    {step.scopeId ? `: ${step.scopeId}` : ''} — {step.status}
                    {step.status === 'VALUE' && (
                      <code className="break-all"> · {display(step.value)}</code>
                    )}
                    {step.winner && (
                      <strong> · {isAr ? 'القيمة المختارة' : 'Selected value'}</strong>
                    )}
                  </li>
                ))}
              </ol>
            </>
          )}
          {result.status === 'SECRET_UNAVAILABLE' && (
            <p>
              {isAr
                ? 'هذا متطلب سر؛ لا تُعرض أو تُحل قيمته من قاعدة الإعدادات، وربطه بمزوّد الأسرار غير مثبت هنا.'
                : 'This is secret requirement metadata. Settings does not resolve its secret value; provider binding is unverified here.'}
            </p>
          )}
          <p className="text-slate-500">
            {isAr
              ? 'يؤثر الإعداد في الخدمات المرتبطة به فقط. النتيجة قراءة تشخيصية وليست تعديلًا.'
              : 'A setting affects connected consumers only. This is a diagnostic read, not a change.'}
          </p>
        </div>
      )}
    </section>
  );
}
