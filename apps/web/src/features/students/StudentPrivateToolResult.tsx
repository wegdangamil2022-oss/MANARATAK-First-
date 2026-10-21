import { PreviewStudentApiClient } from './studentWorkspacePreviewApi';
const ApiClient = import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE === 'prototype' ? PreviewStudentApiClient : LiveApiClient;
import { useEffect, useRef, useState } from 'react';
import { ApiClient as LiveApiClient } from '../../api/client';
import { StudentToolResultView } from '../student-tools/StudentToolResultView';
import { useTranslation } from '../../i18n/I18nProvider';
export function StudentPrivateToolResult({
  savedReference,
  available,
}: {
  savedReference: string;
  available: boolean;
}) {
  const { language } = useTranslation(),
    en = language === 'en';
  const [result, setResult] = useState<unknown>(null),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    ++generation.current;
    setOpen(false);
    setResult(null);
    setError(false);
    setBusy(false);
    return () => {
      ++generation.current;
    };
  }, [savedReference, available]);
  return (
    <div className="my-3 border rounded-lg p-3">
      <button
        type="button"
        disabled={busy || !available}
        onClick={() => {
          if (open) {
            ++generation.current;
            setOpen(false);
            setResult(null);
            return;
          }
          const current = ++generation.current;
          setBusy(true);
          setError(false);
          void ApiClient.getMyPrivateToolResult(savedReference)
            .then((value) => {
              if (current === generation.current) {
                setResult(value);
                setOpen(true);
              }
            })
            .catch(() => {
              if (current === generation.current) {
                setResult(null);
                setError(true);
              }
            })
            .finally(() => {
              if (current === generation.current) setBusy(false);
            });
        }}
      >
        {open
          ? en
            ? 'Hide private result'
            : 'إخفاء النتيجة الخاصة'
          : en
            ? 'Read retained private result'
            : 'عرض النتيجة الخاصة المحفوظة'}
      </button>
      {!available && (
        <p>
          {en
            ? 'The private result expired or is unavailable.'
            : 'انتهت مدة النتيجة الخاصة أو لم تعد متاحة.'}
        </p>
      )}
      {error && (
        <p role="alert">
          {en ? 'Could not read this private result.' : 'تعذرت قراءة النتيجة الخاصة.'}
        </p>
      )}
      {open && <StudentToolResultView value={result} />}
    </div>
  );
}
