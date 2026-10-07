import { useCallback, useEffect, useState } from 'react';
import { refreshPublishedTools, refreshPublishedCountries, refreshPublishedArticles, refreshPublishedServices, refreshPublishedCourses, refreshPublishedUniversities, refreshPublishedScholarships, refreshPublishedMajors, refreshPublishedExams, loadPublicLiveSnapshot, type PublicLiveLoadResult, type PublicLiveLocale } from './publicLiveDataSource';
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
    const isManualReload = reloadVersion > 0;
    const request = isManualReload ? loadPublicLiveSnapshot(locale, true) : loadPublicLiveSnapshot(locale);
    request.then((next) => { if (active) setResult(next); });
    return () => { active = false; };
  }, [mode, locale, reloadVersion]);

  // Recheck publication on return from admin, without reloading every other section.
  useEffect(() => {
    if (mode !== 'api') return;
    let active = true;
    let requestId = 0;
    const refreshTests = async () => {
      if (document.visibilityState === 'hidden') return;
      const current = ++requestId;
      try {
        const [examResult, majorResult, scholarshipResult, universityResult, courseResult, serviceResult, articleResult, countryResult, toolResult] = await Promise.allSettled([refreshPublishedExams(locale), refreshPublishedMajors(locale), refreshPublishedScholarships(locale), refreshPublishedUniversities(locale),refreshPublishedCourses(locale), refreshPublishedServices(locale), refreshPublishedArticles(locale), refreshPublishedCountries(locale), refreshPublishedTools(locale)]);
        if (!active || current !== requestId) return;
        const tools = toolResult.status === 'fulfilled' ? toolResult.value : undefined;
        const countries = countryResult.status === 'fulfilled' ? countryResult.value : undefined;
        const articles = articleResult.status === 'fulfilled' ? articleResult.value : undefined;
        const services = serviceResult.status === 'fulfilled' ? serviceResult.value : undefined;
        const courseData = courseResult.status === 'fulfilled' ? courseResult.value : undefined;
        const exams = examResult.status === 'fulfilled' ? examResult.value : undefined;
        const scholarships = scholarshipResult.status === 'fulfilled' ? scholarshipResult.value : undefined;
        const universities = universityResult.status === 'fulfilled' ? universityResult.value : undefined;
        const majors = majorResult.status === 'fulfilled' ? majorResult.value : undefined;
        if (active && current === requestId) setResult(previous => ({
          ...previous, data: { ...previous.data, ...(tools ? {tools} : {}), ...(countries ? {countries} : {}), ...(articles ? { articles } : {}), ...(services ? {services} : {}), ...(courseData ?? {}), ...(universities ? { universities } : {}), ...(exams ? { exams } : {}), ...(majors ? { majors } : {}), ...(scholarships ? { scholarships } : {}) },
          statuses: { ...previous.statuses, ...(tools ? {tools: tools.length ? 'ready' as const : 'empty' as const} : {}), ...(countries ? {countries: countries.length ? 'ready' as const : 'empty' as const} : {}), ...(articles ? {articles: articles.length ? 'ready' as const : 'empty' as const} : {}), ...(services ? {services: services.length ? 'ready' as const : 'empty' as const} : {}), ...(courseData ? {courses: courseData.courses.length || courseData.importedCourses.length || courseData.paidCourses.length ? "ready" as const : "empty" as const} : {}), ...(universities ? { universities: universities.length ? 'ready' as const : 'empty' as const } : {}), ...(exams ? { exams: exams.length ? 'ready' as const : 'empty' as const } : {}), ...(majors ? { majors: majors.length ? 'ready' as const : 'empty' as const } : {}), ...(scholarships ? { scholarships: scholarships.length ? 'ready' as const : 'empty' as const } : {}) },
        }));
      } catch { /* Retain the last loaded view; do not substitute preview data. */ }
    };
    window.addEventListener('focus', refreshTests);
    document.addEventListener('visibilitychange', refreshTests);
    return () => {
      active = false;
      window.removeEventListener('focus', refreshTests);
      document.removeEventListener('visibilitychange', refreshTests);
    };
  }, [mode, locale]);

  return { mode, ...result, reload };
}
