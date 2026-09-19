import { useCallback, useEffect, useState } from 'react';
import { loadPublicLiveSnapshot, type PublicLiveLoadResult, type PublicLiveLocale } from './publicLiveDataSource';
import { resolvePublicTemplateDataMode, type PublicTemplateDataMode } from './publicScholarshipDataSource';
import { loadPublicPrototypeSnapshot } from './publicPrototypeDataSource';

declare const __MANARATAK_PROTOTYPE_DATA_ENABLED__: boolean;

const initial: PublicLiveLoadResult = {
  data: { scholarships: [], universities: [], majors: [], countries: [], exams: [], courses: [], paidCourses: [], importedCourses: [], articles: [], services: [], careers: [], tools: [] },
  statuses: { scholarships: 'loading', universities: 'loading', majors: 'loading', countries: 'loading', exams: 'loading', courses: 'loading', articles: 'loading', services: 'loading', careers: 'loading', tools: 'loading' },
  errors: {},
};

export function usePublicLiveData(value: unknown, locale: PublicLiveLocale = 'ar') {
  const requestedMode: PublicTemplateDataMode = resolvePublicTemplateDataMode(value);
  const mode: PublicTemplateDataMode = requestedMode === 'prototype' && __MANARATAK_PROTOTYPE_DATA_ENABLED__ ? 'prototype' : 'api';
  const [result, setResult] = useState<PublicLiveLoadResult>(() => {
    if (mode === 'prototype') {
      return loadPublicPrototypeSnapshot();
    }
    return initial;
  });
  const [reloadVersion, setReloadVersion] = useState(0);
  const reload = useCallback(() => setReloadVersion((v) => v + 1), []);

  useEffect(() => {
    let active = true;
    if (mode === 'prototype') {
      setResult(loadPublicPrototypeSnapshot());
      return () => { active = false; };
    }
    const isManualReload = reloadVersion > 0;
    if (isManualReload) {
      setResult(initial);
    }
    loadPublicLiveSnapshot(locale, isManualReload).then((next) => { if (active) setResult(next); });
    return () => { active = false; };
  }, [mode, locale, reloadVersion]);

  return { mode, ...result, reload };
}
