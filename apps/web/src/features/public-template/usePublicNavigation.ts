import { useCallback, useLayoutEffect, useEffect, useRef, useState, type SetStateAction } from 'react';
import type { CategoryType, Scholarship, University, Major, Exam, Course, ImportedCourse, PublicArticle, Service, ServiceAudience } from './types';
import type { TabType } from './components/BottomNavBar';

export const initialNavigation = {
  activeTab: 'home' as TabType,
  selectedCategory: 'all' as CategoryType,
  selectedCourseTrack: null as 'imported' | 'native' | 'paid' | null,
  selectedServiceTrack: null as ServiceAudience | null,
  courseNavigationField: '', searchQuery: '', globalSearchQuery: '',
  isSmartSearchOpen: false, selectedCountry: 'الكل', selectedDegree: 'الكل',
  onlyFullyFunded: false, onlyWithoutIelts: false,
  selectedScholarship: null as Scholarship | null,
  selectedUniversity: null as University | null,
  selectedMajor: null as Major | null,
  selectedExam: null as Exam | null,
  selectedCourse: null as Course | null,
  selectedImportedCourse: null as ImportedCourse | null,
  selectedArticle: null as PublicArticle | null,
  selectedService: null as Service | null,
  serviceReturnTab: null as TabType | null,
  favoriteLaunch: null as {kind: 'country' | 'tool' | 'career'; id?: string} | null,
  countryNavigationName: '', examNavigationQuery: '',
  auxiliaryPage: null as 'faq' | 'contact' | 'language' | null,
  nestedDetailId: '',
  detailSearchAnchor: '',
  detailSearchTerm: '',
};
export type NavigationState = typeof initialNavigation;
const detailKeys = ['selectedScholarship', 'selectedUniversity', 'selectedMajor', 'selectedExam', 'selectedCourse', 'selectedImportedCourse', 'selectedArticle', 'selectedService'] as const;
const emptyDetails = Object.fromEntries(detailKeys.map(key => [key, null]));
type Entry = {version: 29; index: number; route: NavigationState; scroll: number};
function readEntry(): Entry | null {
  const entry = window.history.state?.manaratakPublic;
  return entry?.version === 29 && typeof entry.index === 'number' && entry.route?.activeTab
    ? entry : null;
}

function localePrefix(): string {
  const first = window.location.pathname.split('/').filter(Boolean)[0];
  return first === 'ar' || first === 'en' ? `/${first}` : '';
}

function entityKey(item: any): string {
  return encodeURIComponent(String(item?.slug || item?.publicId || item?.id || ''));
}

/** Canonical public URL for a navigation state. Keeps history/share links aligned with the visible entity. */
export function publicUrlForState(state: NavigationState): string {
  const prefix = localePrefix();
  let path = '/';
  if (state.activeTab === 'auth') path = '/login';
  else if (state.activeTab === 'account') path = '/student';
  else if (state.activeTab === 'ai-tools') path = '/tools';
  else if (state.selectedScholarship) path = `/scholarships/${entityKey(state.selectedScholarship)}`;
  else if (state.selectedUniversity) path = `/universities/${entityKey(state.selectedUniversity)}`;
  else if (state.selectedMajor) path = `/majors/${entityKey(state.selectedMajor)}`;
  else if (state.selectedCourse) path = `/courses/${entityKey(state.selectedCourse)}`;
  else if (state.selectedImportedCourse) path = `/courses/${entityKey(state.selectedImportedCourse)}`;
  else if (state.selectedArticle) path = `/articles/${entityKey(state.selectedArticle)}`;
  else if (state.selectedService) path = `/services/${entityKey(state.selectedService)}`;
  else if (state.selectedExam) path = `/international-tests/${entityKey(state.selectedExam)}`;
  else if (state.selectedCategory === 'countries' && state.nestedDetailId) path = `/countries/${encodeURIComponent(state.nestedDetailId)}`;
  else if (state.selectedCategory === 'jobs' && state.nestedDetailId) path = `/careers/${encodeURIComponent(state.nestedDetailId)}`;
  else if (state.activeTab === 'search' || (state.activeTab === 'home' && state.selectedCategory !== 'all')) {
    const listPaths: Partial<Record<NavigationState['selectedCategory'], string>> = {
      scholarships: '/scholarships', universities: '/universities', majors: '/majors', countries: '/countries',
      courses: '/courses', articles: '/articles', services: '/services', exams: '/international-tests', jobs: '/careers', tools: '/tools', all: '/search',
    };
    path = listPaths[state.selectedCategory] || '/search';
  }
  const params = new URLSearchParams();
  if (path === '/search' && state.globalSearchQuery.trim()) params.set('q', state.globalSearchQuery.trim());
  if (path === '/tools' && state.activeTab === 'ai-tools' && state.nestedDetailId) params.set('detail', state.nestedDetailId);
  if (state.detailSearchTerm.trim()) params.set('match', state.detailSearchTerm.trim());
  const query = params.toString();
  const hash = state.detailSearchAnchor ? `#${encodeURIComponent(state.detailSearchAnchor)}` : '';
  return `${prefix}${path}${query ? `?${query}` : ''}${hash}`;
}

export function routeKey(state: NavigationState) {
  return JSON.stringify([state.activeTab, state.selectedCategory, state.selectedCourseTrack,
    state.selectedServiceTrack, state.isSmartSearchOpen, state.auxiliaryPage,
    state.nestedDetailId, state.countryNavigationName, state.detailSearchAnchor, state.detailSearchTerm,
    ...detailKeys.map(key => state[key]?.id || null)]);
}

/** Public preview navigation. History contains only public view data, never form documents or credentials. */
export function usePublicNavigation() {
  const initialEntry = useRef<Entry | null>(readEntry());
  const [state, setState] = useState<NavigationState>(() => {
    let saved: any = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('manaratak_nav_state_v2');
        if (raw) saved = JSON.parse(raw);
      }
    } catch (_) {}
    return {
      ...initialNavigation,
      ...saved,
      ...initialEntry.current?.route
    };
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('manaratak_nav_state_v2', JSON.stringify(state));
      }
    } catch (_) {}
  }, [state]);
  const current = useRef<Entry | null>(initialEntry.current);
  const restoring = useRef<Entry | null>(current.current);
  const preserveInitialUrl = useRef(initialEntry.current === null);
  const mounted = useRef(false);
  const replaceNext = useRef(false);

  useLayoutEffect(() => {
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    const pop = () => {
      const entry = readEntry();
      if (!entry) return; // Leave navigation outside this public template to its host router.
      restoring.current = entry;
      setState({...initialNavigation, ...entry.route});
    };
    const scroll = () => {
      if (current.current) current.current.scroll = window.scrollY;
    };
    const persist = () => {
      if (current.current) history.replaceState({...history.state, manaratakPublic: current.current}, '', publicUrlForState(current.current.route));
    };
    window.addEventListener('popstate', pop);
    window.addEventListener('scroll', scroll, {passive: true});
    window.addEventListener('pagehide', persist);
    return () => {
      history.scrollRestoration = previousRestoration;
      window.removeEventListener('popstate', pop);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('pagehide', persist);
    };
  }, []);

  useLayoutEffect(() => {
    const firstMount = !mounted.current;
    const restored = restoring.current;
    restoring.current = null;
    const changed = Boolean(current.current && routeKey(current.current.route) !== routeKey(state));
    let entry: Entry;
    if (restored) {
      entry = {...restored, route: state};
    } else if (changed && mounted.current) {
      history.replaceState({...history.state, manaratakPublic: current.current}, '', publicUrlForState(current.current!.route));
      entry = {version: 29, index: current.current!.index + (replaceNext.current ? 0 : 1), route: state, scroll: 0};
      if (replaceNext.current) history.replaceState({...history.state, manaratakPublic: entry}, '', publicUrlForState(state));
      else history.pushState({...history.state, manaratakPublic: entry}, '', publicUrlForState(state));
    } else {
      entry = {version: 29, index: current.current?.index || 0, route: state, scroll: current.current?.scroll || 0};
    }
    current.current = entry;
    replaceNext.current = false;
    // Preserve the address bar on the first render so PublicTemplateApp can hydrate a direct URL.
    if (firstMount && preserveInitialUrl.current) {
      history.replaceState({...history.state, manaratakPublic: entry}, '');
      preserveInitialUrl.current = false;
    } else {
      history.replaceState({...history.state, manaratakPublic: entry}, '', publicUrlForState(state));
    }
    mounted.current = true;
    if (changed || restored) {
      const scrollTop = restored ? restored.scroll : 0;
      window.scrollTo({top: scrollTop, behavior: 'instant'});
      const frame = requestAnimationFrame(() => {
        window.scrollTo({top: scrollTop, behavior: 'instant'});
        const heading = document.querySelector<HTMLElement>('main h1, main h2');
        if (heading) { heading.tabIndex = -1; heading.focus({preventScroll: true}); }
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [state]);

  const setField = useCallback(<K extends keyof NavigationState>(key: K, value: SetStateAction<NavigationState[K]>) => {
    setState(previous => {
      const next = typeof value === 'function'
        ? (value as (old: NavigationState[K]) => NavigationState[K])(previous[key]) : value;
      // A new entity replaces the displayed entity. The previous one lives in browser history.
      const clear = detailKeys.includes(key as typeof detailKeys[number]) && next != null;
      return {...previous,
        ...(key === 'selectedCategory' && next !== previous.selectedCategory ? {nestedDetailId: '', auxiliaryPage: null, detailSearchAnchor: '', detailSearchTerm: ''} : {}),
        ...(clear ? {...emptyDetails, auxiliaryPage: null, isSmartSearchOpen: false, nestedDetailId: ''} : {}), [key]: next};
    });
  }, []);
  const field = <K extends keyof NavigationState>(key: K): [NavigationState[K], (value: SetStateAction<NavigationState[K]>) => void] =>
    [state[key], value => setField(key, value)];
  const navigate = useCallback((patch: Partial<NavigationState>) => {
    setState(previous => ({...initialNavigation, globalSearchQuery: previous.globalSearchQuery, ...patch}));
  }, []);
  const replace = useCallback((patch: Partial<NavigationState>) => {
    replaceNext.current = true;
    setState(previous => ({...initialNavigation, globalSearchQuery: previous.globalSearchQuery, ...patch}));
  }, []);
  const back = useCallback(() => {
    if ((current.current?.index || 0) > 0) history.back();
    else navigate({activeTab: 'home'});
  }, [navigate]);
  return {state, field, navigate, replace, back};
}

