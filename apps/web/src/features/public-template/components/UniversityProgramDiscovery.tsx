import { useTranslation as usePublicTemplateTranslation } from '../../../i18n/I18nProvider';
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
  const { t: publicT } = usePublicTemplateTranslation();

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
      <h3 className="font-bold">{publicT('public_programs_study_language_and_admission_deadlines')}</h3>
      <label>{publicT('public_program_language')}<select disabled={busy} value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="">{publicT('public_all')}</option>
          {choices.map((value) => (
            <option key={value.id} value={value.id}>
              {value.name}
            </option>
          ))}
        </select>
      </label>
      <label>{publicT('public_study_arrangement')}<select disabled={busy} value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="">{publicT('public_all')}</option>
          <option value="FULL_TIME">{publicT('public_full_time')}</option>
          <option value="PART_TIME">{publicT('public_part_time')}</option>
          <option value="UNKNOWN">{publicT('public_not_specified')}</option>
        </select>
      </label>
      {error && <p role="status">{error}</p>}
      {busy && <p role="status">{publicT('public_loading')}</p>}
      {!busy && !error && !items.length && <p>{publicT('public_no_matching_verified_published_programs_in_the_loaded')}</p>}
      {items.map((item) => (
        <article key={item.id} className="rounded border p-3">
          <h4>{item.sourceProgramName}</h4>
          {item.study ? (
            <>
              <p>{publicT('public_study_language_2')}{' '}
                {item.study.languages.map((value) => value.nameAr ?? value.name).join('، ') ||
                  publicT('public_not_specified_4')}
              </p>
              <p>{publicT('public_study_arrangement_2')}{' '}
                {item.study.studyMode === 'FULL_TIME'
                  ? publicT('public_full_time')
                  : item.study.studyMode === 'PART_TIME'
                    ? publicT('public_part_time')
                    : publicT('public_not_specified')}{' '}{publicT('public_teaching_method')}{' '}
                {item.study.teachingDelivery === 'ONLINE'
                  ? publicT('public_remote')
                  : item.study.teachingDelivery === 'ON_CAMPUS'
                    ? publicT('public_on_campus')
                    : item.study.teachingDelivery === 'HYBRID'
                      ? publicT('public_hybrid')
                      : publicT('public_not_specified_4')}
              </p>
              {item.study.durationValue && (
                <p>{publicT('public_duration_2')}{' '}{item.study.durationValue}{' '}
                  {item.study.durationUnit === 'MONTHS' ? publicT('public_months') : publicT('public_year')}
                </p>
              )}
              {item.study.entryEligibility && (
                <p>{publicT('public_program_requirements')}{' '}{item.study.entryEligibility}</p>
              )}
            </>
          ) : (
            <p>{publicT('public_study_language_and_requirements_have_not_been_verified')}</p>
          )}
          <ul>
            {item.intakes.map((intake) => (
              <li key={intake.id}>
                {intake.applicantSegment} ·{' '}
                {intake.window === 'OPEN'
                  ? publicT('public_applications_open')
                  : intake.window === 'CLOSED'
                    ? publicT('public_applications_closed')
                    : intake.window === 'UPCOMING'
                      ? publicT('public_applications_have_not_opened_yet')
                      : publicT('public_status_unconfirmed')}{' '}{publicT('public_closing')}{' '}
                <time dateTime={intake.applicationClose}>
                  {new Date(intake.applicationClose).toLocaleString('ar', {
                    timeZone: intake.timezone,
                  })}
                </time>{' '}
                ({intake.timezone}) ·{' '}
                <a href={intake.officialSourceUrl} target="_blank" rel="noopener noreferrer">{publicT('public_official_source')}</a>
              </li>
            ))}
          </ul>
        </article>
      ))}
      {cursor && (
        <button type="button" disabled={busy} onClick={() => void load(true)}>{publicT('public_load_more_programs')}</button>
      )}
    </section>
  );
}
