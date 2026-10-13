import { useEffect, useRef, useState } from 'react';
import { ApiClient } from '../../../api/client';
interface Program {
  id: string;
  sourceProgramName: string;
  study: {
    languages: Array<{ id: string; name: string; nameAr?: string | null }>;
    studyMode: string;
    teachingDelivery: string;
    durationValue: number | null;
    durationUnit: string | null;
    entryEligibility: string | null;
  } | null;
  intakes: Array<{
    id: string;
    applicantSegment: string;
    intakeStart: string;
    applicationClose: string;
    timezone: string;
    window: string;
    officialSourceUrl: string;
  }>;
}
export function UniversityProgramDiscovery({ universityPublicId }: { universityPublicId: string }) {
  const [items, setItems] = useState<Program[]>([]);
  const [language, setLanguage] = useState('');
  const [mode, setMode] = useState('');
  const [choices, setChoices] = useState<Array<{ id: string; name: string }>>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const lock = useRef(false);
  const load = async (next = false) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    const current = generation.current;
    const params = new URLSearchParams({ universityPublicId, limit: '25' });
    if (language) params.set('languageReferenceId', language);
    if (mode) params.set('studyMode', mode);
    if (next && cursor) params.set('cursor', cursor);
    try {
      const result = await ApiClient.getUniversityProgramPage<{
        items: Program[];
        nextCursor: string | null;
      }>(params);
      if (current !== generation.current) return;
      setItems((old) =>
        next
          ? [
              ...old,
              ...result.items.filter((item) => !old.some((previous) => previous.id === item.id)),
            ]
          : result.items,
      );
      setCursor(result.nextCursor);
      setChoices((old) => [
        ...new Map(
          [
            ...old,
            ...result.items.flatMap(
              (item) =>
                item.study?.languages.map((value) => ({
                  id: value.id,
                  name: value.nameAr ?? value.name,
                })) ?? [],
            ),
          ].map((value) => [value.id, value]),
        ).values(),
      ]);
    } catch {
      if (current === generation.current)
        setError('تعذر تحميل تفاصيل البرامج؛ لا تفترض عدم وجودها.');
    } finally {
      lock.current = false;
      if (current === generation.current) setBusy(false);
    }
  };
  useEffect(() => {
    generation.current++;
    setItems([]);
    setCursor(null);
    void load();
    return () => {
      generation.current++;
      lock.current = false;
    };
  }, [universityPublicId, language, mode]);
  return (
    <section className="space-y-3 rounded-xl border p-4">
      <h3 className="font-bold">البرامج ولغة الدراسة ومواعيد القبول</h3>
      <label>
        لغة البرنامج
        <select disabled={busy} value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="">الكل</option>
          {choices.map((value) => (
            <option key={value.id} value={value.id}>
              {value.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        نمط الدراسة
        <select disabled={busy} value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="">الكل</option>
          <option value="FULL_TIME">دوام كامل</option>
          <option value="PART_TIME">دوام جزئي</option>
          <option value="UNKNOWN">غير موضح</option>
        </select>
      </label>
      {error && <p role="status">{error}</p>}
      {busy && <p role="status">جارٍ التحميل</p>}
      {!busy && !error && !items.length && <p>لا برامج منشورة موثقة مطابقة في النتائج المحملة.</p>}
      {items.map((item) => (
        <article key={item.id} className="rounded border p-3">
          <h4>{item.sourceProgramName}</h4>
          {item.study ? (
            <>
              <p>
                لغة الدراسة:{' '}
                {item.study.languages.map((value) => value.nameAr ?? value.name).join('، ') ||
                  'غير موضحة'}
              </p>
              <p>
                نمط الدراسة:{' '}
                {item.study.studyMode === 'FULL_TIME'
                  ? 'دوام كامل'
                  : item.study.studyMode === 'PART_TIME'
                    ? 'دوام جزئي'
                    : 'غير موضح'}{' '}
                · طريقة التدريس:{' '}
                {item.study.teachingDelivery === 'ONLINE'
                  ? 'عن بعد'
                  : item.study.teachingDelivery === 'ON_CAMPUS'
                    ? 'في الحرم'
                    : item.study.teachingDelivery === 'HYBRID'
                      ? 'هجين'
                      : 'غير موضحة'}
              </p>
              {item.study.durationValue && (
                <p>
                  المدة: {item.study.durationValue}{' '}
                  {item.study.durationUnit === 'MONTHS' ? 'شهرًا' : 'سنة'}
                </p>
              )}
              {item.study.entryEligibility && (
                <p>متطلبات البرنامج: {item.study.entryEligibility}</p>
              )}
            </>
          ) : (
            <p>لغة ومتطلبات الدراسة غير موثقة بعد؛ لا تستنتج الأهلية من وصف الجامعة العام.</p>
          )}
          <ul>
            {item.intakes.map((intake) => (
              <li key={intake.id}>
                {intake.applicantSegment} ·{' '}
                {intake.window === 'OPEN'
                  ? 'التقديم مفتوح'
                  : intake.window === 'CLOSED'
                    ? 'التقديم مغلق'
                    : intake.window === 'UPCOMING'
                      ? 'التقديم لم يفتح بعد'
                      : 'الحالة غير مؤكدة'}{' '}
                · الإغلاق:{' '}
                <time dateTime={intake.applicationClose}>
                  {new Date(intake.applicationClose).toLocaleString('ar', {
                    timeZone: intake.timezone,
                  })}
                </time>{' '}
                ({intake.timezone}) ·{' '}
                <a href={intake.officialSourceUrl} target="_blank" rel="noopener noreferrer">
                  المصدر الرسمي
                </a>
              </li>
            ))}
          </ul>
        </article>
      ))}
      {cursor && (
        <button type="button" disabled={busy} onClick={() => void load(true)}>
          تحميل البرامج التالية
        </button>
      )}
    </section>
  );
}
