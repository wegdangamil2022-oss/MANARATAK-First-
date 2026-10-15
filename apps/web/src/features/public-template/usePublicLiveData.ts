import { useCallback, useEffect, useState } from 'react';
import { loadPublicLiveSnapshot, type PublicLiveLoadResult, type PublicLiveLocale } from './publicLiveDataSource';
import { resolvePublicTemplateDataMode, type PublicTemplateDataMode } from './publicScholarshipDataSource';

declare const __MANARATAK_PROTOTYPE_DATA_ENABLED__: boolean;

const initial: PublicLiveLoadResult = {
  data: { scholarships: [], universities: [], majors: [], countries: [], exams: [], courses: [], paidCourses: [], importedCourses: [], articles: [], services: [], careers: [], tools: [] },
  statuses: { scholarships: 'loading', universities: 'loading', majors: 'loading', countries: 'loading', exams: 'loading', courses: 'loading', articles: 'loading', services: 'loading', careers: 'loading', tools: 'loading' },
  errors: {},
};

export function usePublicLiveData(value: unknown, locale: PublicLiveLocale = 'ar') {
  const isProd = typeof __MANARATAK_PROTOTYPE_DATA_ENABLED__ !== 'undefined' && !__MANARATAK_PROTOTYPE_DATA_ENABLED__;

  const requestedMode = resolvePublicTemplateDataMode(value);
  const mode: PublicTemplateDataMode = isProd ? 'api' : requestedMode;
  const [result, setResult] = useState<PublicLiveLoadResult>(initial);
  const [reloadVersion, setReloadVersion] = useState(0);
  const reload = useCallback(() => setReloadVersion((v) => v + 1), []);

  useEffect(() => {
    let active = true;
    setResult(initial);
    if (mode === 'prototype') {
      void import('./publicPrototypeDataSource').then(({ loadPublicPrototypeSnapshot }) => {
        if (active) setResult(loadPublicPrototypeSnapshot());
      }).catch(() => {
        if (active) setResult({
          ...initial,
          statuses: Object.fromEntries(Object.keys(initial.statuses).map((key) => [key, 'unavailable'])) as PublicLiveLoadResult['statuses'],
          errors: { scholarships: 'PROTOTYPE_DATA_UNAVAILABLE' },
        });
      });
      return () => { active = false; };
    }
    let generation = 0;
    const load = async (force = false) => {
      const request = ++generation;
      try {
        const next = await (force ? loadPublicLiveSnapshot(locale, true) : loadPublicLiveSnapshot(locale));
        if (active && request === generation) setResult(next);
      } catch {
        if (active && request === generation) setResult({ ...initial,
          statuses: Object.fromEntries(Object.keys(initial.statuses).map(key => [key, 'unavailable'])) as PublicLiveLoadResult['statuses'],
        });
      }
    };
    void load(reloadVersion > 0);
    const refresh = () => { if (document.visibilityState !== 'hidden') void load(true); };
    // Three-minute preview/image-grant renewal; focus/visibility explicitly rechecks publication.
    const timer = window.setInterval(refresh, 180000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false; generation++;
      window.clearInterval(timer); window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [mode, locale, reloadVersion]);

  return { mode, ...result, reload };
}
