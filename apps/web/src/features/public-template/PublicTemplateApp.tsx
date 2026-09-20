import React, { useState, useEffect, useRef } from 'react';
import './template.css';
import {readStored, writeStored, readStoredArray} from './storage';
import { usePublicNavigation } from './usePublicNavigation';
import { usePublicLiveData } from './usePublicLiveData';
import { usePublicRelationshipGraph } from './usePublicRelationshipGraph';
import { ApiClient, type StablePublicGraphIdentity } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import { mapPublicScholarshipDto } from './publicScholarshipDataSource';
import {
  mapArticle, mapCareer, mapCountry, mapCourse, mapExam, mapPublicMajorDto, mapPublicUniversityDto, mapService,
} from './publicLiveDataSource';
import { PublicInfoPage } from './components/PublicInfoPage';
import { CourseTrackPreview } from './components/CourseTrackPreview';
import { OwnerCourseDetail } from './components/OwnerCourseDetail';

// Statically imported heavy route views & modals for instant tab switching and transitions
import { CourseStudyRoomView } from './components/CourseStudyRoomView';
import { GlobalSearchPage } from './components/GlobalSearchPage';
import { ComparePage } from './components/ComparePage';
import { FavoritesPage } from './components/FavoritesPage';
import { SmartSearchPage } from './components/SmartSearchPage';
import { ScholarshipsSearchPage } from './components/ScholarshipsSearchPage';
import { CountriesSearchPage } from './components/CountriesSearchPage';
import { AIToolsPage } from './components/AIToolsPage';
import { ExamsSearchPage } from './components/ExamsSearchPage';
import { CoursesLandingPage } from './components/CoursesLandingPage';
import { CoursesSearchPage } from './components/CoursesSearchPage';
import { ImportedCourseDetail } from './components/ImportedCourseDetail';
import { CareersSearchPage } from './components/CareersSearchPage';
import { ArticlesSearchPage } from './components/ArticlesSearchPage';
import { ArticleDetail } from './components/ArticleDetail';
import { ServicesLandingPage } from './components/ServicesLandingPage';
import { ServicesDirectoryPage } from './components/ServicesDirectoryPage';
import { ServiceDetail } from './components/ServiceDetail';
import { ScholarshipDetailModal } from './components/ScholarshipDetailModal';
import { MajorDetailModal } from './components/MajorDetailModal';
import { UniversityDetailModal } from './components/UniversityDetailModal';
import { ExamDetailModal } from './components/ExamDetailModal';
import { MajorsSearchPage } from './components/MajorsSearchPage';
import { UniversitiesSearchPage } from './components/UniversitiesSearchPage';
import { AuthPage as PrototypeAuthPage } from './components/AuthPage';
import { StudentWorkspacePage as PrototypeStudentWorkspacePage } from './components/StudentWorkspacePage';
import { StudentAuthPage as LiveStudentAuthPage } from '../students/StudentAuthPage';
import { StudentWorkspacePage as LiveStudentWorkspacePage } from '../students/StudentWorkspacePage';

import {
  Scholarship,
  University,
  Course,
  Major,
  ApplicationMilestone,
  PushNotificationItem,
  UserProfile,
  Language,
  CategoryType,
  Exam,
  ImportedCourse,
  PublicArticle,
  Service,
  ServiceAudience,
  FavoriteKey,
  FavoriteKind,
  CountryDestination,
  CareerOpportunityPreview,
} from './types';
import { INITIAL_MILESTONES, INITIAL_NOTIFICATIONS } from './data/personalPreviewData';
import { Header } from './components/Header';
import { SmartSearchBar } from './components/SmartSearchBar';
import { HeroBanner } from './components/HeroBanner';
import { CategoryNav } from './components/CategoryNav';
import { FeaturedScholarships } from './components/FeaturedScholarships';
import { AIToolsBanner } from './components/AIToolsBanner';
import { FeaturedUniversities } from './components/FeaturedUniversities';
import { FeaturedCountries } from './components/FeaturedCountries';
import { FeaturedMajors } from './components/FeaturedMajors';
import { FeaturedCourses } from './components/FeaturedCourses';
import { FeaturedExams } from './components/FeaturedExams';
import { FeaturedJobs } from './components/FeaturedJobs';
import { FeaturedArticles } from './components/FeaturedArticles';
import { FeaturedServices } from './components/FeaturedServices';
import { RoadmapPreview } from './components/RoadmapPreview';
import { FaqPreview } from './components/FaqPreview';
import { ContactSection } from './components/ContactSection';
import { BottomNavBar, TabType } from './components/BottomNavBar';
import { LearnerProgressTracker } from './components/LearnerProgressTracker';
import { PushNotificationCenter } from './components/PushNotificationCenter';
import { UniversitiesList } from './components/UniversitiesList';
import { CoursesList } from './components/CoursesList';
import { NavigationDrawer } from './components/NavigationDrawer';
import { consumePostLoginAction, consumePostLoginReturn, preservePostLoginAction, preservePostLoginReturn } from '../students/postLoginIntent';
import {
  Filter,
  SlidersHorizontal,
  Sparkles,
  Heart,
  GraduationCap,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Search,
  ArrowUpDown,
  AlertTriangle,
  RefreshCw,
  Building2,
  ClipboardCheck,
  BookOpen,
  BriefcaseBusiness,
  BadgeDollarSign,
} from 'lucide-react';

export default function App() {
  const { language } = useTranslation();
  const publicLive = usePublicLiveData(import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE, language);
  const publicDataMode = publicLive.mode;
  const { scholarships, universities, majors, countries, exams, courses, paidCourses, importedCourses, articles, services, careers, tools } = publicLive.data;
  const scholarshipDataStatus = publicDataMode === 'prototype' ? 'prototype' : publicLive.statuses.scholarships;
  const unavailableDomains = Object.entries(publicLive.statuses).filter(([, status]) => status === 'unavailable').map(([domain]) => domain);
  const loadingDomains = Object.entries(publicLive.statuses).filter(([, status]) => status === 'loading').map(([domain]) => domain);
  const navigation = usePublicNavigation();
  const { back: goBack, navigate, replace: replaceNavigation } = navigation;
  // UI States
  const [activeTab, setActiveTab] = navigation.field('activeTab');
  const [selectedCategory, setSelectedCategory] = navigation.field('selectedCategory');
  const [selectedCourseTrack, setSelectedCourseTrack] = navigation.field('selectedCourseTrack');
  const [selectedServiceTrack, setSelectedServiceTrack] = navigation.field('selectedServiceTrack');
  const [courseNavigationField, setCourseNavigationField] = navigation.field('courseNavigationField');

  const [directCountry, setDirectCountry] = useState<CountryDestination | null>(null);
  const [directCareer, setDirectCareer] = useState<CareerOpportunityPreview | null>(null);
  const countriesForView = directCountry && !countries.some((item) => item.id === directCountry.id || item.slug === directCountry.slug)
    ? [directCountry, ...countries]
    : countries;
  const careersForView = directCareer && !careers.some((item) => item.id === directCareer.id || item.slug === directCareer.slug)
    ? [directCareer, ...careers]
    : careers;

  const directRouteHydrated = useRef(false);
  const initialLocation = useRef({ pathname: window.location.pathname, search: window.location.search, hash: window.location.hash });
  const directRouteRequest = useRef('');
  useEffect(() => {
    if (directRouteHydrated.current) return;
    if (publicDataMode === 'prototype' && Object.values(publicLive.statuses).includes('loading')) return;
    const segments = initialLocation.current.pathname.split('/').filter(Boolean);
    if (segments[0] === 'ar' || segments[0] === 'en') segments.shift();
    const [section = '', rawKey = ''] = segments;
    const key = decodeURIComponent(rawKey || '');
    const params = new URLSearchParams(initialLocation.current.search);
    const searchAnchor = decodeURIComponent(initialLocation.current.hash.replace(/^#/, ''));
    const searchTerm = params.get('match') || '';
    const matchesKey = (item: any) => [item?.slug, item?.publicId, item?.id, item?.toolKey].filter(Boolean).some((value) => String(value) === key);
    const finish = (patch: Parameters<typeof replaceNavigation>[0]) => {
      directRouteHydrated.current = true;
      directRouteRequest.current = '';
      replaceNavigation({ ...patch, detailSearchAnchor: searchAnchor, detailSearchTerm: searchTerm });
    };
    const fetchOnce = (requestKey: string, request: () => Promise<void>) => {
      if (directRouteRequest.current === requestKey) return;
      directRouteRequest.current = requestKey;
      void request().catch(() => {
        // A direct owner URL that no longer exists degrades to its public list without inventing fallback data.
        const category = section === 'international-tests' ? 'exams' : section === 'careers' ? 'jobs' : section as CategoryType;
        finish({ activeTab: section === 'tools' ? 'ai-tools' : 'search', selectedCategory: category || 'all' });
      });
    };

    let patch: Parameters<typeof replaceNavigation>[0] | null = null;
    if (!section) {
      const isStudyingStored = typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('mn_is_studying_course') === 'true';
      const scholarshipsCourse = publicDataMode === 'prototype' ? courses.find(c => c.id === 'c1') : undefined;
      if (isStudyingStored && scholarshipsCourse) {
        patch = {
          activeTab: 'search',
          selectedCategory: 'courses',
          selectedCourseTrack: 'native',
          selectedCourse: scholarshipsCourse
        };
      } else {
        patch = { activeTab: 'home' };
      }
    }
    else if (section === 'login') patch = { activeTab: 'auth' };
    else if (section === 'student') patch = { activeTab: 'account' };
    else if (section === 'search') patch = { activeTab: 'search', selectedCategory: 'all', globalSearchQuery: params.get('q') || '' };
    else if (section === 'scholarships') {
      const selected = key ? scholarships.find(matchesKey) || null : null;
      if (key && !selected && publicDataMode === 'api') {
        fetchOnce(`scholarships:${key}`, async () => finish({ activeTab: 'search', selectedCategory: 'scholarships', selectedScholarship: mapPublicScholarshipDto(await ApiClient.getScholarshipBySlug(key)) }));
        return;
      }
      patch = { activeTab: 'search', selectedCategory: 'scholarships', selectedScholarship: selected };
    } else if (section === 'universities') {
      const selected = key ? universities.find(matchesKey) || null : null;
      if (key && !selected && publicDataMode === 'api') {
        fetchOnce(`universities:${key}`, async () => finish({ activeTab: 'search', selectedCategory: 'universities', selectedUniversity: mapPublicUniversityDto(await ApiClient.getUniversityBySlug(key)) }));
        return;
      }
      patch = { activeTab: 'search', selectedCategory: 'universities', selectedUniversity: selected };
    } else if (section === 'majors') {
      const selected = key ? majors.find(matchesKey) || null : null;
      if (key && !selected && publicDataMode === 'api') {
        fetchOnce(`majors:${key}`, async () => finish({ activeTab: 'search', selectedCategory: 'majors', selectedMajor: mapPublicMajorDto(await ApiClient.getMajorBySlug(key)) }));
        return;
      }
      patch = { activeTab: 'search', selectedCategory: 'majors', selectedMajor: selected };
    } else if (section === 'courses') {
      const ownerSelected = key ? [...courses, ...paidCourses].find(matchesKey) || null : null;
      const importedSelected = key ? importedCourses.find(matchesKey) || null : null;
      if (key && !ownerSelected && !importedSelected && publicDataMode === 'api') {
        fetchOnce(`courses:${key}`, async () => {
          const mapped = mapCourse(await ApiClient.getCourseBySlug(key));
          finish(mapped.track === 'imported'
            ? { activeTab: 'search', selectedCategory: 'courses', selectedCourseTrack: 'imported', selectedImportedCourse: mapped.imported }
            : { activeTab: 'search', selectedCategory: 'courses', selectedCourseTrack: mapped.track, selectedCourse: mapped.course });
        });
        return;
      }
      if (ownerSelected) {
        patch = { activeTab: 'search', selectedCategory: 'courses', selectedCourseTrack: ownerSelected.accessType === 'PAID' ? 'paid' : 'native', selectedCourse: ownerSelected };
      } else if (importedSelected) {
        patch = { activeTab: 'search', selectedCategory: 'courses', selectedCourseTrack: 'imported', selectedImportedCourse: importedSelected };
      } else {
        patch = { activeTab: 'search', selectedCategory: 'courses', selectedCourseTrack: null };
      }
    } else if (section === 'articles') {
      const selected = key ? articles.find(matchesKey) || null : null;
      if (key && !selected && publicDataMode === 'api') {
        fetchOnce(`articles:${key}`, async () => finish({ activeTab: 'search', selectedCategory: 'articles', selectedArticle: mapArticle(await ApiClient.getCmsContentBySlug(key, language)) }));
        return;
      }
      patch = { activeTab: 'search', selectedCategory: 'articles', selectedArticle: selected };
    } else if (section === 'content') {
      if (key && publicDataMode === 'api') {
        fetchOnce(`content:${key}`, async () => finish({ activeTab: 'search', selectedCategory: 'articles', selectedArticle: mapArticle(await ApiClient.getCmsContentBySlug(key, language)) }));
        return;
      }
      patch = { activeTab: 'search', selectedCategory: 'articles' };
    } else if (section === 'services') {
      const selected = key ? services.find(matchesKey) || null : null;
      if (key && !selected && publicDataMode === 'api') {
        fetchOnce(`services:${key}`, async () => {
          const service = mapService(await ApiClient.getServiceBySlug(key));
          finish({ activeTab: 'search', selectedCategory: 'services', selectedServiceTrack: service.audience, selectedService: service });
        });
        return;
      }
      patch = { activeTab: 'search', selectedCategory: 'services', selectedServiceTrack: selected?.audience || null, selectedService: selected };
    } else if (section === 'international-tests') {
      const selected = key ? exams.find(matchesKey) || null : null;
      if (key && !selected && publicDataMode === 'api') {
        fetchOnce(`international-tests:${key}`, async () => finish({ activeTab: 'search', selectedCategory: 'exams', selectedExam: mapExam(await ApiClient.getInternationalTestBySlug(key)) }));
        return;
      }
      patch = { activeTab: 'search', selectedCategory: 'exams', selectedExam: selected };
    } else if (section === 'countries') {
      const selected = key ? countriesForView.find(matchesKey) || null : null;
      if (key && !selected && publicDataMode === 'api') {
        fetchOnce(`countries:${key}`, async () => {
          directRouteRequest.current = '';
          setDirectCountry(mapCountry(await ApiClient.getStudyDestinationBySlug(key), language));
        });
        return;
      }
      patch = { activeTab: 'search', selectedCategory: 'countries', nestedDetailId: selected ? key : '' };
    } else if (section === 'careers') {
      const selected = key ? careersForView.find(matchesKey) || null : null;
      if (key && !selected && publicDataMode === 'api') {
        fetchOnce(`careers:${key}`, async () => {
          directRouteRequest.current = '';
          setDirectCareer(mapCareer(await ApiClient.getCareerJobBySlug(key)));
        });
        return;
      }
      patch = { activeTab: 'search', selectedCategory: 'jobs', nestedDetailId: selected ? selected.id : '' };
    } else if (section === 'tools') {
      const detailKey = params.get('detail') || '';
      const detail = detailKey ? tools.find((item) => item.id === detailKey || item.toolKey === detailKey) : null;
      patch = { activeTab: 'ai-tools', selectedCategory: 'all', nestedDetailId: detail?.id || '' };
    } else {
      // The host router owns unknown routes; do not rewrite them from the public template.
      directRouteHydrated.current = true;
      return;
    }

    finish(patch);
  }, [publicDataMode, scholarships, universities, majors, countriesForView, exams, courses, paidCourses, importedCourses, articles, services, careersForView, tools, publicLive.statuses, replaceNavigation, language]);
  useEffect(() => {
    if (selectedCategory !== 'courses') {
      setSelectedCourseTrack(null);
      setCourseNavigationField('');
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedCategory !== 'services') {
      setSelectedServiceTrack(null);
    }
  }, [selectedCategory]);

  const justClickedSearchRef = useRef(false);

  useEffect(() => {
    if (justClickedSearchRef.current) {
      justClickedSearchRef.current = false;
      return;
    }
    setIsHeaderSearchVisible(false);
  }, [navigation.state]);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = readStored('manaratak_dark_mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
  });

  // Search & Filter States
  const [searchQuery, setSearchQuery] = navigation.field('searchQuery');
  const [globalSearchQuery, setGlobalSearchQuery] = navigation.field('globalSearchQuery');
  const [isHeaderSearchVisible, setIsHeaderSearchVisible] = useState(!!globalSearchQuery);
  const [isSmartSearchOpen, setIsSmartSearchOpen] = navigation.field('isSmartSearchOpen');
  const [selectedCountry, setSelectedCountry] = navigation.field('selectedCountry');
  const [selectedDegree, setSelectedDegree] = navigation.field('selectedDegree');
  const [onlyFullyFunded, setOnlyFullyFunded] = navigation.field('onlyFullyFunded');
  const [onlyWithoutIelts, setOnlyWithoutIelts] = navigation.field('onlyWithoutIelts');

  // Domain datasets are owner-API backed in live mode. Prototype data is available only through the explicit dynamic prototype adapter.
  const [milestones, setMilestones] = useState<ApplicationMilestone[]>(() => {
    return publicDataMode === 'prototype'
      ? readStoredArray<ApplicationMilestone>('manaratak_milestones', INITIAL_MILESTONES)
      : [];
  });

  const [favoriteKeys, setFavoriteKeys] = useState<FavoriteKey[]>(() => {
    if (publicDataMode !== 'prototype') return [];
    const savedV2 = readStored('manaratak_favorites_v2');
    if (savedV2) {
      try {
        const parsed = JSON.parse(savedV2);
        if (Array.isArray(parsed)) return [...new Set(parsed.filter((item): item is FavoriteKey => typeof item === 'string' && /^(scholarship|university|major|country|course|exam|article|service|tool|career):.+$/.test(item)))];
      } catch (_) {
        // Fall through to legacy migration.
      }
    }

    const legacy = readStored('manaratak_favorites');
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === 'string').map((id) => `scholarship:${id}` as FavoriteKey);
      } catch (_) {
        // Ignore malformed legacy storage.
      }
    }

    return ['scholarship:csc-china', 'scholarship:chevening-uk'];
  });

  const [notifications, setNotifications] = useState<PushNotificationItem[]>(() => {
    if (publicDataMode !== 'prototype') return [];
    return readStoredArray<PushNotificationItem>('manaratak_notifications', INITIAL_NOTIFICATIONS).filter((item, index, list) => !item.title.includes('مرحباً بك في منصة منارتك') || list.findIndex(candidate => candidate.title.includes('مرحباً بك في منصة منارتك')) === index).map(item => item.title.includes('مرحباً بك في منصة منارتك') ? {...item, id: 'welcome-v29', actionType: undefined, targetId: undefined, body: 'هذه معاينة محلية للإشعارات. ستُفعّل التنبيهات الحقيقية بعد ربط الخدمة.'} : item);
  });

  // Modal Dialogs
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [selectedScholarship, setSelectedScholarship] = navigation.field('selectedScholarship');
  const [selectedMajor, setSelectedMajor] = navigation.field('selectedMajor');
  const [selectedUniversity, setSelectedUniversity] = navigation.field('selectedUniversity');
  const [selectedExam, setSelectedExam] = navigation.field('selectedExam');
  const [selectedCourse, setSelectedCourse] = navigation.field('selectedCourse');
  const [selectedImportedCourse, setSelectedImportedCourse] = navigation.field('selectedImportedCourse');
  const [selectedArticle, setSelectedArticle] = navigation.field('selectedArticle');
  const [selectedService, setSelectedService] = navigation.field('selectedService');
  const [serviceReturnTab, setServiceReturnTab] = navigation.field('serviceReturnTab');
  const [favoriteLaunch, setFavoriteLaunch] = navigation.field('favoriteLaunch');
  const [countryNavigationName, setCountryNavigationName] = navigation.field('countryNavigationName');
  const [examNavigationQuery, setExamNavigationQuery] = navigation.field('examNavigationQuery');
  const [detailSearchAnchor, setDetailSearchAnchor] = navigation.field('detailSearchAnchor');
  const [detailSearchTerm, setDetailSearchTerm] = navigation.field('detailSearchTerm');
  const [isStudyingCourse, setIsStudyingCourse] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('mn_is_studying_course') === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('mn_is_studying_course', isStudyingCourse ? 'true' : 'false');
    }
  }, [isStudyingCourse]);
  const [activeToast, setActiveToast] = useState<PushNotificationItem | null>(null);

  const activeCountryIdentity = navigation.state.nestedDetailId || countryNavigationName || '';
  const activeCountryForGraph = countries.find((country) =>
    country.id === activeCountryIdentity ||
    country.publicId === activeCountryIdentity ||
    country.slug === activeCountryIdentity ||
    country.iso2Code === activeCountryIdentity.toUpperCase(),
  );

  const publicGraph = usePublicRelationshipGraph(publicDataMode, {
    majorSlug: selectedMajor?.slug || (selectedMajor ? selectedMajor.id : undefined),
    universitySlug: selectedUniversity?.slug || (selectedUniversity ? selectedUniversity.id : undefined),
    scholarshipSlug: selectedScholarship?.slug || (selectedScholarship ? selectedScholarship.id : undefined),
    countryIso2Code: activeCountryForGraph?.iso2Code,
  });

  const byIdentity = <T extends { id: string; publicId?: string; slug?: string; ownerId?: string }>(items: T[], identity: string): T | undefined =>
    items.find((item) => item.id === identity || item.publicId === identity || item.slug === identity || item.ownerId === identity);

  const graphIdentityTarget = <T extends { id: string; publicId?: string; slug?: string; ownerId?: string }>(
    items: T[],
    identity: string,
    graphIdentities: Array<{ ownerId: string; publicId?: string; slug?: string }> = [],
  ): T | undefined => {
    const direct = byIdentity(items, identity);
    if (direct) return direct;
    const graphIdentity = graphIdentities.find((item) =>
      item.ownerId === identity || item.publicId === identity || item.slug === identity,
    );
    if (!graphIdentity) return undefined;
    return items.find((item) =>
      item.ownerId === graphIdentity.ownerId ||
      (graphIdentity.publicId && item.publicId === graphIdentity.publicId) ||
      (graphIdentity.slug && (item.slug === graphIdentity.slug || item.id === graphIdentity.slug)),
    );
  };

  const openPublishedScholarshipByIdentity = async (
    identity: string,
    graphIdentities: StablePublicGraphIdentity[] = [],
  ) => {
    const local = graphIdentityTarget(scholarships, identity, graphIdentities);
    if (local) {
      setCountryNavigationName('');
      setSelectedUniversity(null);
      setSelectedMajor(null);
      setSelectedScholarship(local);
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    const graphIdentity = graphIdentities.find((item) =>
      item.ownerId === identity || item.publicId === identity || item.slug === identity,
    );
    const slug = graphIdentity?.slug;
    if (!slug || publicDataMode !== 'api') return;
    try {
      const dto = await ApiClient.getScholarshipBySlug(slug);
      setCountryNavigationName('');
      setSelectedUniversity(null);
      setSelectedMajor(null);
      setSelectedScholarship(mapPublicScholarshipDto(dto));
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch {
      // Public owner API remains authoritative; do not substitute prototype data.
    }
  };

  const openPublishedUniversityByIdentity = async (
    identity: string,
    graphIdentities: StablePublicGraphIdentity[] = [],
  ) => {
    const local = graphIdentityTarget(universities, identity, graphIdentities);
    if (local) {
      setCountryNavigationName('');
      setSelectedScholarship(null);
      setSelectedMajor(null);
      setSelectedUniversity(local);
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    const graphIdentity = graphIdentities.find((item) =>
      item.ownerId === identity || item.publicId === identity || item.slug === identity,
    );
    if (!graphIdentity?.slug || publicDataMode !== 'api') return;
    try {
      const dto = await ApiClient.getUniversityBySlug(graphIdentity.slug);
      setCountryNavigationName('');
      setSelectedScholarship(null);
      setSelectedMajor(null);
      setSelectedUniversity(mapPublicUniversityDto(dto));
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch {
      // Do not invent or substitute a relationship target.
    }
  };

  const openPublishedMajorByIdentity = async (
    identity: string,
    graphIdentities: StablePublicGraphIdentity[] = [],
  ) => {
    const local = graphIdentityTarget(majors, identity, graphIdentities);
    if (local) {
      setCountryNavigationName('');
      setSelectedScholarship(null);
      setSelectedUniversity(null);
      setSelectedMajor(local);
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    const graphIdentity = graphIdentities.find((item) =>
      item.ownerId === identity || item.publicId === identity || item.slug === identity,
    );
    if (!graphIdentity?.slug || publicDataMode !== 'api') return;
    try {
      const dto = await ApiClient.getMajorBySlug(graphIdentity.slug);
      setCountryNavigationName('');
      setSelectedScholarship(null);
      setSelectedUniversity(null);
      setSelectedMajor(mapPublicMajorDto(dto));
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch {
      // Do not invent or substitute a relationship target.
    }
  };



  const openSection = (target: string) => {
    setIsMenuOpen(false);
    setIsNotificationOpen(false);
    if (publicDataMode === 'api' && ['favorites', 'tracker', 'notifications'].includes(target)) {
      navigate({ activeTab: target === 'tracker' ? 'tracker' : target === 'favorites' ? 'favorites' : 'account' });
      setIsHeaderSearchVisible(false);
      return;
    }
    if (['scholarships','universities','countries','majors','courses','exams','articles','services','jobs'].includes(target)) {
      navigate({activeTab: 'search', selectedCategory: target as CategoryType});
      setIsHeaderSearchVisible(false);
    } else if (target === 'tools' || target === 'ai-tools') {
      navigate({activeTab: 'ai-tools'});
      setIsHeaderSearchVisible(false);
    } else if (target === 'all' || target === 'search') {
      if (target === 'search') {
        justClickedSearchRef.current = true;
        setIsHeaderSearchVisible(true);
        if (activeTab !== 'home' && activeTab !== 'search') {
          navigate({ activeTab: 'search', selectedCategory: 'all' });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          const searchInput = document.getElementById('header-global-search');
          if (searchInput) {
            searchInput.focus();
            (searchInput as HTMLInputElement).select();
          }
        }, 150);
      } else {
        navigate({activeTab: 'search'});
        setIsHeaderSearchVisible(false);
      }
    } else {
      navigate({activeTab: target === 'home' ? 'home' : target as TabType});
      setIsHeaderSearchVisible(false);
    }
  };
  const openStudentTools = (toolKey?: string) => {
    setIsMenuOpen(false);
    setIsNotificationOpen(false);
    navigate({
      activeTab: 'ai-tools',
      nestedDetailId: toolKey ?? '',
      favoriteLaunch: toolKey ? { kind: 'tool', id: toolKey } : null,
    });
  };
  const openLanguage = () => {
    setIsMenuOpen(false);
    navigate({auxiliaryPage: 'language'});
  };
  // Close overlays when the user navigates with browser Back/Forward.
  useEffect(() => {
    const close = () => {setIsMenuOpen(false); setIsNotificationOpen(false);};
    window.addEventListener('popstate', close);
    return () => window.removeEventListener('popstate', close);
  }, []);

  // Sync Dark Mode Class to HTML and Body
  useEffect(() => {
    writeStored('manaratak_dark_mode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Save to LocalStorage
  useEffect(() => {
    if (publicDataMode !== 'prototype') return;
    writeStored('manaratak_milestones', JSON.stringify(milestones));
  }, [milestones, publicDataMode]);

  useEffect(() => {
    if (publicDataMode !== 'prototype') return;
    writeStored('manaratak_favorites_v2', JSON.stringify(favoriteKeys));
  }, [favoriteKeys, publicDataMode]);


  useEffect(() => {
    if (publicDataMode !== 'api') return;
    let cancelled = false;
    void (async () => {
      try {
        const hydrated = await ApiClient.listMyHydratedStudentSavedItems();
        if (cancelled) return;
        const keys = hydrated.flatMap(({ savedItem }) => {
          const kind = favoriteKindFromSavedType(savedItem.entityType);
          return kind ? [makeFavoriteKey(kind, savedItem.entityId)] : [];
        });
        setFavoriteKeys([...new Set(keys)]);
        const pending = consumePostLoginAction();
        if (pending?.kind === 'SAVE_FAVORITE') {
          await ApiClient.createMyStudentSavedItem({ entityType: pending.entityType, entityId: pending.entityId, entitySlug: pending.entitySlug ?? pending.entityId, metadata: { source: 'public-discovery-auth-handoff' } });
          const kind = favoriteKindFromSavedType(pending.entityType);
          if (kind && !cancelled) setFavoriteKeys((prev) => [...new Set([...prev, makeFavoriteKey(kind, pending.entityId)])]);
        } else if (pending?.kind === 'TRACK_APPLICATION') {
          const existing = (await ApiClient.listMyStudentApplicationTrackers()).find((item) => item.scholarshipId === pending.scholarshipId && item.status === 'ACTIVE');
          if (!existing) await ApiClient.createMyStudentApplicationTracker({ scholarshipId: pending.scholarshipId, scholarshipSlug: pending.scholarshipSlug, notes: pending.notes ?? 'بدء متابعة طلب المنحة بعد تسجيل الدخول', checklistLabels: ['ترجمة وتصديق المستندات', 'إعداد السيرة الذاتية الأكاديمية', 'صياغة خطاب الدافع', 'الحصول على خطابات التوصية', 'تقديم الطلب الإلكتروني الرسمي'] });
          if (!cancelled) {
            window.history.replaceState({...window.history.state}, '', '/student?tab=journey');
            setActiveTab('account');
          }
        } else if (pending?.kind === 'REQUEST_SERVICE') {
          const created = await ApiClient.createMyStudentServiceRequest({ serviceId: pending.serviceId, requestParameters: pending.requestParameters });
          if (!cancelled) {
            window.history.replaceState({...window.history.state}, '', `/student?tab=services&requestId=${encodeURIComponent(created.id)}`);
            setActiveTab('account');
          }
        }
      } catch {
        // Anonymous live browsing is valid; no local fake favorite state is created.
      }
    })();
    return () => { cancelled = true; };
  }, [publicDataMode]);

  useEffect(() => {
    if (publicDataMode !== 'prototype') return;
    writeStored('manaratak_notifications', JSON.stringify(notifications));
  }, [notifications, publicDataMode]);

  // Handle document direction on language change
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Instant Push Notification Chime Sound Helper
  const playPushNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  // Trigger Interactive Push Notification Simulation
  const triggerInstantPush = (customNotification?: Partial<PushNotificationItem>) => {
    if (publicDataMode !== 'prototype') return;
    const newAlert: PushNotificationItem = {
      id: customNotification?.id || `push-${Date.now()}`,
      title: customNotification?.title || 'تنبيه تجريبي من منارتك',
      body:
        customNotification?.body ||
        'هذا اختبار محلي لعرض الإشعارات، وليس إعلانًا عن فرصة حقيقية.',
      timestamp: 'الآن',
      type: customNotification?.type || 'system',
      read: false,
      actionType: customNotification?.actionType,
      targetId: customNotification?.targetId,
    };

    setNotifications((prev) => [newAlert, ...prev]);
    setActiveToast(newAlert);
    playPushNotificationSound();

    // Auto dismiss toast after 6 seconds
    setTimeout(() => {
      setActiveToast((curr) => (curr?.id === newAlert.id ? null : curr));
    }, 6000);
  };

  // Initial welcome push after 2.5 seconds
  useEffect(() => {
    if (publicDataMode !== 'prototype') return;
    if (notifications.some(item => item.id === 'welcome-v29' || item.title.includes('مرحباً بك في منصة منارتك'))) return;
    const timer = setTimeout(() => {
      setNotifications(previous => previous.some(item => item.id === 'welcome-v29') ? previous : [{
        id: 'welcome-v29', timestamp: 'الآن', read: false,
        title: 'مرحباً بك في منصة منارتك للفرص التعليمية!',
        body: 'هذه معاينة محلية للإشعارات. ستُفعّل التنبيهات الحقيقية بعد ربط الخدمة.',
        type: 'system',
      }, ...previous]);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Deadline 3-day Local Notification Check (نظام متابعة تقدم المتعلمين)
  useEffect(() => {
    if (publicDataMode !== 'prototype' || !milestones.length) return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    milestones.forEach((m, index) => {
      if (!m.deadline) return;

      const deadlineDate = new Date(m.deadline);
      deadlineDate.setHours(0, 0, 0, 0);

      const diffTime = deadlineDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Trigger if exactly 3 days left
      if (diffDays === 3) {
        const alreadyNotified = notifications.some(
          (n) => n.type === 'deadline' && n.targetId === m.scholarshipId,
        );

        if (!alreadyNotified) {
          timers.push(setTimeout(
            () => {
              triggerInstantPush({
                title: 'تنبيه الموعد النهائي: 3 أيام متبقية!',
                body: `باقي 3 أيام فقط على إغلاق التقديم لمنحة ${m.scholarshipTitle}. تأكد من إكمال جميع المتطلبات في نظام المتابعة.`,
                type: 'deadline',
                actionType: 'tracker',
                targetId: m.scholarshipId,
              });
            },
            index * 1000 + 3500,
          )); // Stagger if multiple, run after initial welcome push
        }
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [milestones, notifications]);

  const makeFavoriteKey = (kind: FavoriteKind, id: string): FavoriteKey => `${kind}:${id}` as FavoriteKey;

  const liveSavedItemType = (kind: FavoriteKind): string | null => ({
    scholarship: 'SCHOLARSHIP', university: 'UNIVERSITY', major: 'MAJOR', course: 'COURSE',
    article: 'CMS_CONTENT', service: 'SERVICE', tool: 'STUDENT_TOOL',
  } as Partial<Record<FavoriteKind, string>>)[kind] ?? null;

  const favoriteKindFromSavedType = (entityType: string): FavoriteKind | null => ({
    SCHOLARSHIP: 'scholarship', UNIVERSITY: 'university', MAJOR: 'major', COURSE: 'course',
    CMS_CONTENT: 'article', SERVICE: 'service', STUDENT_TOOL: 'tool',
  } as Record<string, FavoriteKind>)[entityType] ?? null;

  const favoriteIdsFor = (kind: FavoriteKind): string[] => {
    const prefix = `${kind}:`;
    return favoriteKeys.filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length));
  };

  const isFavorite = (kind: FavoriteKind, id: string) => favoriteKeys.includes(makeFavoriteKey(kind, id));

  // Live favorites are Phase 15 Saved Items. Browser-only state is prototype-only.
  const handleToggleFavorite = async (kind: FavoriteKind, id: string) => {
    const key = makeFavoriteKey(kind, id);
    if (publicDataMode === 'prototype') {
      setFavoriteKeys((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
      return;
    }
    const entityType = liveSavedItemType(kind);
    if (!entityType) {
      triggerInstantPush({ title: 'الحفظ غير متاح لهذا النوع بعد', body: 'لن نعرض حفظاً محلياً وهمياً في الوضع الفعلي.', type: 'system' });
      return;
    }
    try {
      await ApiClient.getCurrentStudentIdentity();
    } catch {
      preservePostLoginAction({ kind: 'SAVE_FAVORITE', entityType, entityId: id, entitySlug: id });
      preservePostLoginReturn(`${window.location.pathname}${window.location.search}`);
      setActiveTab('auth');
      return;
    }
    try {
      if (favoriteKeys.includes(key)) {
        await ApiClient.removeMyStudentSavedItem(entityType, id);
        setFavoriteKeys((prev) => prev.filter((item) => item !== key));
      } else {
        await ApiClient.createMyStudentSavedItem({ entityType, entityId: id, entitySlug: id, metadata: { source: 'public-discovery' } });
        setFavoriteKeys((prev) => prev.includes(key) ? prev : [...prev, key]);
      }
    } catch (error) {
      triggerInstantPush({ title: 'تعذر تحديث العناصر المحفوظة', body: error instanceof Error ? error.message : 'حاول مرة أخرى.', type: 'system' });
    }
  };

  // Add scholarship to learner progress tracker
  const handleAddToTracker = async (sch: Scholarship) => {
    if (publicDataMode === 'prototype') {
      const exists = milestones.some((m) => m.scholarshipId === sch.id);
      if (exists) { setActiveTab('tracker'); setSelectedScholarship(null); return; }
      const newMilestone: ApplicationMilestone = {
        id: `track-${Date.now()}`,
        scholarshipId: sch.id,
        scholarshipTitle: sch.title,
        country: sch.country,
        deadline: sch.deadline,
        stage: 'تجهيز المستندات', progress: 0,
        notes: `بدء إعداد ملف التقديم الرسمي لمنحة ${sch.title}`,
        checklist: [
          { id: `c-${Date.now()}-1`, task: 'ترجمة وتصديق كشف العلامات وشهادة التخرج', completed: false },
          { id: `c-${Date.now()}-2`, task: 'تجهيز السيرة الذاتية بصيغة أكاديمية', completed: false },
          { id: `c-${Date.now()}-3`, task: 'صياغة خطاب الدافع بواسطة الذكاء الاصطناعي', completed: false },
          { id: `c-${Date.now()}-4`, task: 'الحصول على خطابات التوصية الأكاديمية', completed: false },
          { id: `c-${Date.now()}-5`, task: 'تقديم الطلب الإلكتروني على البوابة الرسمية', completed: false },
        ],
      };
      setMilestones((prev) => [newMilestone, ...prev]); setSelectedScholarship(null); setActiveTab('tracker'); return;
    }
    try {
      await ApiClient.getCurrentStudentIdentity();
    } catch {
      preservePostLoginAction({ kind: 'TRACK_APPLICATION', scholarshipId: sch.id, scholarshipSlug: sch.slug ?? sch.id, notes: `بدء إعداد ملف التقديم الرسمي لمنحة ${sch.title}` });
      preservePostLoginReturn('/student?tab=journey');
      setSelectedScholarship(null); setActiveTab('auth'); return;
    }
    try {
      const trackers = await ApiClient.listMyStudentApplicationTrackers();
      const existing = trackers.find((item) => item.scholarshipId === sch.id && item.status === 'ACTIVE');
      if (!existing) await ApiClient.createMyStudentApplicationTracker({ scholarshipId: sch.id, scholarshipSlug: sch.slug ?? sch.id, notes: `بدء إعداد ملف التقديم الرسمي لمنحة ${sch.title}`, checklistLabels: ['ترجمة وتصديق كشف العلامات وشهادة التخرج', 'تجهيز السيرة الذاتية بصيغة أكاديمية', 'صياغة خطاب الدافع', 'الحصول على خطابات التوصية الأكاديمية', 'تقديم الطلب الإلكتروني على البوابة الرسمية'] });
      setSelectedScholarship(null);
      window.history.replaceState({...window.history.state}, '', '/student?tab=journey');
      setActiveTab('account');
    } catch (error) {
      triggerInstantPush({ title: 'تعذر إضافة المنحة للمتابعة', body: error instanceof Error ? error.message : 'حاول مرة أخرى.', type: 'system' });
    }
  };

  const handleRequestService = async (service: Service, requestParameters: Record<string, unknown>) => {
    if (publicDataMode !== 'api') return;
    try { await ApiClient.getCurrentStudentIdentity(); }
    catch {
      preservePostLoginAction({ kind: 'REQUEST_SERVICE', serviceId: service.id, serviceSlug: service.slug ?? service.id, requestParameters });
      preservePostLoginReturn(`/services/${service.slug ?? service.id}`);
      setSelectedService(null); setActiveTab('auth'); return;
    }
    try {
      const created = await ApiClient.createMyStudentServiceRequest({ serviceId: service.id, requestParameters });
      window.history.replaceState({...window.history.state}, '', `/student?tab=services&requestId=${encodeURIComponent(created.id)}`);
      setActiveTab('account');
    } catch (error) {
      triggerInstantPush({ title: 'تعذر إنشاء طلب الخدمة', body: error instanceof Error ? error.message : 'حاول مرة أخرى.', type: 'system' });
    }
  };

  // Filter scholarships logic
  const filteredScholarships = scholarships.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.field.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCountry = selectedCountry === 'الكل' || s.countryReferenceId === selectedCountry;
    const matchesDegree =
      selectedDegree === 'الكل' || s.degreeLevel.includes(selectedDegree as any);
    const matchesFunding = !onlyFullyFunded || s.fundingType === 'ممولة بالكامل';
    const matchesIelts = !onlyWithoutIelts || s.withoutIelts === true;

    return matchesSearch && matchesCountry && matchesDegree && matchesFunding && matchesIelts;
  });

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  const favoriteTypeCounts = favoriteKeys.reduce<Partial<Record<FavoriteKind, number>>>((counts, key) => {
    const kind = key.split(':', 1)[0] as FavoriteKind;
    counts[kind] = (counts[kind] || 0) + 1;
    return counts;
  }, {});

  const isCompareRoute = /^\/(?:ar|en)\/compare(?:\/|$)/.test(window.location.pathname);

  return (
    <div className="manaratak-public flex flex-col min-h-screen w-full bg-[var(--mn-page)] text-[var(--mn-text)] selection:bg-[var(--mn-accent)]/30 selection:text-[var(--mn-heading)] font-['Cairo',sans-serif] pb-24 sm:pb-28 transition-colors mn-panel ">
      {/* App Header (Top Sticky) */}
      <Header
        language={language}
        onToggleLanguage={openLanguage}
        onOpenMenu={() => setIsMenuOpen(true)}
        onOpenNotifications={() => publicDataMode === 'api' ? openSection('account') : setIsNotificationOpen(true)}
        onOpenProfile={() => openSection('account')}
        unreadCount={unreadNotificationsCount}
        activeTab={activeTab}
        onTabChange={openSection}
        selectedCategory={selectedService ? 'services' : selectedCategory}
        globalSearchQuery={globalSearchQuery}
        onGlobalSearchChange={setGlobalSearchQuery}
        onGlobalSearchSubmit={(query) => navigate({activeTab: 'search', globalSearchQuery: query})}
        onOpenSmartSearch={(query) => navigate({activeTab: 'search', globalSearchQuery: query, isSmartSearchOpen: true})}
        onSelectCategory={(category) => openSection(category === 'all' ? 'home' : category)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        isSearchVisible={isHeaderSearchVisible}
      />

      {/* Main Content Area */}
      <main className="w-full mx-auto transition-all flex-1 flex flex-col">
        <React.Suspense
          fallback={
            <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#142B5F] dark:border-[#D6A43B] border-t-transparent mb-3" />
              <span className="text-xs font-semibold text-[var(--mn-text-muted)]">جاري التحميل...</span>
            </div>
          }
        >
        {publicDataMode === 'api' && unavailableDomains.length > 0 && (
          <div className="mx-auto mt-3 flex w-[calc(100%-1rem)] max-w-5xl items-center justify-between gap-3 rounded-2xl border border-[var(--mn-danger-border)] bg-[var(--mn-danger-soft)] px-3 py-2 text-[11px] text-[var(--mn-danger-text)]">
            <div className="flex min-w-0 items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>تعذر تحميل بعض البيانات الحية ({unavailableDomains.join(', ')}). لم يتم استبدالها ببيانات تجريبية.</span>
            </div>
            <button type="button" onClick={publicLive.reload} className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-current px-2.5 py-1.5 font-bold">
              <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
            </button>
          </div>
        )}
        {publicDataMode === 'api' && unavailableDomains.length === 0 && loadingDomains.length > 0 && (
          <div className="mx-auto mt-3 w-[calc(100%-1rem)] max-w-5xl rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] px-3 py-2 text-center text-[10px] font-bold text-[var(--mn-text-muted)]">
            جاري تحميل البيانات المنشورة من مصادر منارتك الحية…
          </div>
        )}
        {isCompareRoute ? (
          <ComparePage locale={language} onBack={goBack} />
        ) : navigation.state.auxiliaryPage ? (
          <PublicInfoPage page={navigation.state.auxiliaryPage} onBack={goBack} onServices={() => openSection('services')} />
        ) : isSmartSearchOpen ? (
          <SmartSearchPage
            initialQuery={globalSearchQuery}
            onQueryChange={setGlobalSearchQuery}
            scholarships={scholarships}
            universities={universities}
            onBack={goBack}
            onOpenNormalSearch={(query) => {
              setGlobalSearchQuery(query);
              setIsSmartSearchOpen(false);
              setSelectedCategory('all');
              setActiveTab('search');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenScholarship={(item) => {
              setIsSmartSearchOpen(false);
              setSelectedScholarship(item);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenUniversity={(item) => {
              setIsSmartSearchOpen(false);
              setSelectedUniversity(item);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onNavigateCategory={(category) => {
              setIsSmartSearchOpen(false);
              setSelectedCategory(category);
              setActiveTab(category === 'tools' ? 'ai-tools' : 'search');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
          />
        ) : selectedService ? (
          <ServiceDetail
            service={selectedService}
            searchAnchor={detailSearchAnchor}
            searchTerm={detailSearchTerm}
            isFavorite={isFavorite('service', selectedService.id)}
            onToggleFavorite={(id) => handleToggleFavorite('service', id)}
            onRequestService={publicDataMode === 'api' ? (requestParameters) => handleRequestService(selectedService, requestParameters) : undefined}
            onBack={goBack}
            onOpenContext={(category) => {
              setSelectedService(null);
              setSelectedServiceTrack(null);
              setSelectedUniversity(null);
              setSelectedScholarship(null);
              setSelectedMajor(null);
              setSelectedExam(null);
              setSelectedArticle(null);
              setSelectedImportedCourse(null);
              setSearchQuery('');
              setCountryNavigationName('');
              setExamNavigationQuery('');
              setSelectedCategory(category);
              setActiveTab('search');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
          />
        ) : selectedArticle ? (
          <ArticleDetail
            article={selectedArticle}
            searchAnchor={detailSearchAnchor}
            searchTerm={detailSearchTerm}
            isFavorite={isFavorite('article', selectedArticle.id)}
            onToggleFavorite={(id) => handleToggleFavorite('article', id)}
            onBack={goBack}
            onOpenScholarship={(id) => {
              const scholarship = scholarships.find((item) => item.id === id);
              if (!scholarship) return;
              setSelectedArticle(null);
              setSelectedUniversity(null);
              setSelectedMajor(null);
              setSelectedExam(null);
              setSelectedImportedCourse(null);
              setSelectedScholarship(scholarship);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenUniversity={(id) => {
              const university = universities.find((item) => item.id === id);
              if (!university) return;
              setSelectedArticle(null);
              setSelectedScholarship(null);
              setSelectedMajor(null);
              setSelectedExam(null);
              setSelectedImportedCourse(null);
              setSelectedUniversity(university);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenCountry={(countryId) => {
              setSelectedArticle(null);
              setSelectedScholarship(null);
              setSelectedUniversity(null);
              setSelectedMajor(null);
              setSelectedExam(null);
              setSelectedImportedCourse(null);
              setCountryNavigationName(countryId);
              setSelectedCategory('countries');
              setActiveTab('search');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenMajor={(id) => {
              const major = majors.find((item) => item.id === id);
              if (!major) return;
              setSelectedArticle(null);
              setSelectedScholarship(null);
              setSelectedUniversity(null);
              setSelectedExam(null);
              setSelectedImportedCourse(null);
              setSelectedMajor(major);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenExam={(id) => {
              const exam = exams.find((item) => item.id === id);
              if (!exam) return;
              setSelectedArticle(null);
              setSelectedScholarship(null);
              setSelectedUniversity(null);
              setSelectedMajor(null);
              setSelectedImportedCourse(null);
              setSelectedExam(exam);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenCourse={(id) => {
              const course = importedCourses.find((item) => item.id === id);
              if (!course) return;
              setSelectedArticle(null);
              setSelectedScholarship(null);
              setSelectedUniversity(null);
              setSelectedMajor(null);
              setSelectedExam(null);
              setSelectedImportedCourse(course);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
          />
        ) : selectedScholarship ? (
          <ScholarshipDetailModal
            scholarship={selectedScholarship}
            searchAnchor={detailSearchAnchor}
            searchTerm={detailSearchTerm}
            onClose={goBack}
            onToggleFavorite={(id) => handleToggleFavorite('scholarship', id)}
            isFavorite={isFavorite('scholarship', selectedScholarship.id)}
            onAddToTracker={handleAddToTracker}
            onOpenAiLetter={() => openStudentTools('motivation-letter-generator')}
            onOpenUniversity={(universityId) => {
              void openPublishedUniversityByIdentity(
                universityId,
                publicGraph.scholarship?.relationships.universities ?? [],
              );
            }}
            onOpenMajor={(majorId) => {
              void openPublishedMajorByIdentity(
                majorId,
                publicGraph.scholarship?.relationships.majors ?? [],
              );
            }}
            onOpenCountry={() => {
              if (!selectedScholarship.countryReferenceId) return;
              setCountryNavigationName(selectedScholarship.countryReferenceId);
              setSelectedScholarship(null);
              setSelectedUniversity(null);
              setSelectedMajor(null);
              setSelectedCategory('countries');
              setActiveTab('search');
            }}
            onOpenExam={(examId) => {
              const exam = byIdentity(exams, examId);
              if (!exam) return;
              setSelectedScholarship(null);
              setSelectedUniversity(null);
              setSelectedMajor(null);
              setSelectedExam(exam);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenScholarship={(scholarshipId) => {
              const related = byIdentity(scholarships, scholarshipId);
              if (!related) return;
              setSelectedUniversity(null);
              setSelectedMajor(null);
              setSelectedScholarship(related);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenArticle={(articleId) => {
              const article = articles.find((item) => item.id === articleId);
              if (!article) return;
              setSelectedScholarship(null);
              setSelectedArticle(article);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenService={(service) => {
              setSelectedScholarship(null);
              setSelectedServiceTrack(service.audience);
              setSelectedService(service);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
          />
        ) : selectedUniversity ? (
          <UniversityDetailModal
            university={selectedUniversity}
            searchAnchor={detailSearchAnchor}
            searchTerm={detailSearchTerm}
            onClose={goBack}
            isSaved={isFavorite('university', selectedUniversity.id)}
            onToggleSave={(e) => {
              e.stopPropagation();
              handleToggleFavorite('university', selectedUniversity.id);
            }}
            onOpenCountry={() => {
              if (!selectedUniversity.countryReferenceId) return;
              setCountryNavigationName(selectedUniversity.countryReferenceId);
              setSearchQuery('');
              setSelectedUniversity(null);
              setSelectedScholarship(null);
              setSelectedMajor(null);
              setSelectedCategory('countries');
              setActiveTab('search');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenMajor={(majorId) => {
              const relatedMajor = graphIdentityTarget(majors, majorId, publicGraph.university?.relationships.majors);
              if (!relatedMajor) return;
              setSelectedUniversity(null);
              setSelectedScholarship(null);
              setSelectedMajor(relatedMajor);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenScholarship={(scholarshipId) => {
              const related = graphIdentityTarget(scholarships, scholarshipId, publicGraph.university?.relationships.scholarships.data);
              if (!related) return;
              setSelectedUniversity(null);
              setSelectedMajor(null);
              setSelectedScholarship(related);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenExam={(examId) => {
              const exam = byIdentity(exams, examId);
              if (!exam) return;
              setSelectedUniversity(null);
              setSelectedScholarship(null);
              setSelectedMajor(null);
              setSelectedExam(exam);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenArticle={(articleId) => {
              const article = articles.find((item) => item.id === articleId);
              if (!article) return;
              setSelectedUniversity(null);
              setSelectedArticle(article);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            contextualServices={services}
            onOpenService={(service) => {
              // Keep the university selected underneath the service detail so Back returns
              // to the originating university context instead of losing the navigation origin.
              setServiceReturnTab(null);
              setSelectedServiceTrack(service.audience);
              setSelectedService(service);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
          />
        ) : selectedMajor ? (
          <MajorDetailModal
            major={selectedMajor}
            searchAnchor={detailSearchAnchor}
            searchTerm={detailSearchTerm}
            relationshipGraph={publicGraph.majorView}
            relationshipGraphStatus={publicGraph.loading ? 'loading' : publicGraph.error ? 'unavailable' : 'ready'}
            isFavorite={isFavorite('major', selectedMajor.id)}
            onToggleFavorite={(id) => handleToggleFavorite('major', id)}
            onClose={goBack}
            onOpenUniversity={(universityId) => {
              const university = graphIdentityTarget(universities, universityId, publicGraph.major?.relationships.universities.data);
              if (!university) return;
              setSelectedMajor(null);
              setSelectedScholarship(null);
              setSelectedUniversity(university);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenScholarship={(scholarshipId) => {
              const related = graphIdentityTarget(scholarships, scholarshipId, publicGraph.major?.relationships.scholarships.data);
              if (!related) return;
              setSelectedMajor(null);
              setSelectedUniversity(null);
              setSelectedScholarship(related);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenCourse={(courseKey) => {
              const importedCourse = graphIdentityTarget(importedCourses, courseKey, publicGraph.major?.relationships.courses.data);
              setSelectedMajor(null);
              setSelectedUniversity(null);
              setSelectedScholarship(null);
              setSelectedExam(null);

              if (importedCourse) {
                setSelectedImportedCourse(importedCourse);
                window.scrollTo({ top: 0, behavior: 'instant' });
                return;
              }

              setSearchQuery(courseKey);
              setCourseNavigationField('');
              setSelectedCourseTrack('imported');
              setSelectedCategory('courses');
              setActiveTab('search');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenCourseCollection={(field) => {
              setSelectedMajor(null);
              setSelectedUniversity(null);
              setSelectedScholarship(null);
              setSelectedExam(null);
              setSelectedImportedCourse(null);
              setSearchQuery('');
              setCourseNavigationField(field);
              setSelectedCourseTrack('imported');
              setSelectedCategory('courses');
              setActiveTab('search');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenMajor={(majorId) => {
              const relatedMajor = majors.find((item) => item.id === majorId);
              if (!relatedMajor) return;
              setSelectedUniversity(null);
              setSelectedScholarship(null);
              setSelectedMajor(relatedMajor);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
          />
        ) : selectedCourse ? (
          isStudyingCourse ? (
            <CourseStudyRoomView
              course={selectedCourse}
              onBack={() => setIsStudyingCourse(false)}
            />
          ) : (
            <OwnerCourseDetail
              course={selectedCourse}
              track={selectedCourse.accessType === 'PAID' ? 'paid' : 'native'}
              onBack={goBack}
              onStartStudy={() => {
                setIsStudyingCourse(true);
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
            />
          )
        ) : selectedImportedCourse ? (
          <ImportedCourseDetail
            course={selectedImportedCourse}
            searchAnchor={detailSearchAnchor}
            searchTerm={detailSearchTerm}
            isFavorite={isFavorite('course', selectedImportedCourse.id)}
            onToggleFavorite={(id) => handleToggleFavorite('course', id)}
            onBack={goBack}
            onOpenMajor={(majorId) => {
              const major = majors.find((item) => item.id === majorId);
              if (!major) return;
              setSelectedImportedCourse(null);
              setSelectedUniversity(null);
              setSelectedScholarship(null);
              setSelectedExam(null);
              setSelectedMajor(major);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenUniversity={(universityId) => {
              const university = byIdentity(universities, universityId);
              if (!university) return;
              setSelectedImportedCourse(null);
              setSelectedMajor(null);
              setSelectedScholarship(null);
              setSelectedExam(null);
              setSelectedUniversity(university);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenScholarship={(scholarshipId) => {
              const scholarship = byIdentity(scholarships, scholarshipId);
              if (!scholarship) return;
              setSelectedImportedCourse(null);
              setSelectedMajor(null);
              setSelectedUniversity(null);
              setSelectedExam(null);
              setSelectedScholarship(scholarship);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenCountry={(countryId) => {
              setCountryNavigationName(countryId);
              setSelectedImportedCourse(null);
              setSelectedMajor(null);
              setSelectedUniversity(null);
              setSelectedScholarship(null);
              setSelectedExam(null);
              setSelectedCategory('countries');
              setActiveTab('search');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenExam={(examId) => {
              const exam = byIdentity(exams, examId);
              if (!exam) return;
              setSelectedImportedCourse(null);
              setSelectedMajor(null);
              setSelectedUniversity(null);
              setSelectedScholarship(null);
              setSelectedExam(exam);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
          />
        ) : selectedExam ? (
          <ExamDetailModal
            exam={selectedExam}
            searchAnchor={detailSearchAnchor}
            searchTerm={detailSearchTerm}
            isFavorite={isFavorite('exam', selectedExam.id)}
            onToggleFavorite={(id) => handleToggleFavorite('exam', id)}
            onClose={goBack}
            onOpenUniversity={(universityId) => {
              const university = byIdentity(universities, universityId);
              if (!university) return;
              setSelectedExam(null);
              setSelectedScholarship(null);
              setSelectedMajor(null);
              setSelectedUniversity(university);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenScholarship={(scholarshipId) => {
              const scholarship = byIdentity(scholarships, scholarshipId);
              if (!scholarship) return;
              setSelectedExam(null);
              setSelectedUniversity(null);
              setSelectedMajor(null);
              setSelectedScholarship(scholarship);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenCountry={(countryId) => {
              setCountryNavigationName(countryId);
              setSearchQuery('');
              setSelectedExam(null);
              setSelectedUniversity(null);
              setSelectedScholarship(null);
              setSelectedMajor(null);
              setSelectedCategory('countries');
              setActiveTab('search');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            onOpenArticle={(articleId) => {
              const article = articles.find((item) => item.id === articleId);
              if (!article) return;
              setSelectedExam(null);
              setSelectedArticle(article);
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
          />
        ) : (
          <>
            {/* TAB 1: HOME VIEW (Exactly as in Reference Screenshot) */}
            {activeTab === 'home' && selectedCategory === 'all' && (
              <div className="mn-public-container flex flex-col items-center pt-2 sm:pt-3">
                <div className="w-full space-y-1">
                  {/* Global Search + Smart Search now live persistently in the Header. */}
                  {/* Hero Banner matching Mockup */}
                  <HeroBanner
                    onExploreClick={() => {
                      setActiveTab('search');
                      setSelectedCategory('scholarships');
                    }}
                    onOpenAiHelper={() => openStudentTools()}
                  />

                  {/* 3. Category Icons matching Mockup */}
                  <CategoryNav
                    selectedCategory={selectedCategory}
                    onSelectCategory={openSection}
                  />
                </div>

                {/* --- Timeline Container for All Sections --- */}
                <div className="w-full relative mt-2 pb-4">
                  {/* Subtle gold timeline track */}
                  <div className="absolute right-0 sm:-right-2 top-8 bottom-12 w-[3px] z-0">
                    <div className="sticky top-1/2 w-full h-24 -mt-12 bg-gradient-to-b from-transparent via-[var(--mn-accent-soft)]/80 to-transparent rounded-full animate-pulse-subtle shadow-[0_0_8px_rgba(214,164,59,0.6)]"></div>
                  </div>

                  <div className="space-y-5 relative z-10 w-full">
                    {/* 1. Featured Scholarships */}
                    <div className="relative w-full">
                      <FeaturedScholarships
                        scholarships={scholarships}
                        onSelectScholarship={(s) => setSelectedScholarship(s)}
                        onToggleFavorite={(id) => handleToggleFavorite('scholarship', id)}
                        favoriteIds={favoriteIdsFor('scholarship')}
                        onViewAllClick={() => {
                          setActiveTab('search');
                          setSelectedCategory('scholarships');
                        }}
                      />
                    </div>

                    {/* 2. Featured Majors */}
                    <div className="relative w-full">
                      <FeaturedMajors
                        majors={majors}
                        onSelectMajor={(major) => {
                          setSearchQuery(major.name);
                          setActiveTab('search');
                          setSelectedCategory('majors');
                        }}
                        onViewAllClick={() => {
                          setActiveTab('search');
                          setSelectedCategory('majors');
                        }}
                      />
                    </div>

                    {/* 3. Featured Universities */}
                    <div className="relative w-full">
                      <FeaturedUniversities
                        universities={universities}
                        onSelectUniversity={(uni) => {
                          setSelectedUniversity(uni);
                        }}
                        onViewAllClick={() => {
                          setActiveTab('search');
                          setSelectedCategory('universities');
                        }}
                      />
                    </div>

                    {/* 4. Featured Countries */}
                    <div className="relative w-full">
                      <FeaturedCountries
                        onSelectCountry={(countryId) => navigate({activeTab: 'search', selectedCategory: 'countries', countryNavigationName: countryId})}
                        onViewAllClick={() => {
                          setActiveTab('search');
                          setSelectedCategory('countries');
                        }}
                      />
                    </div>

                    {/* 5. AI Tools Section */}
                    <div className="relative w-full">
                      <AIToolsBanner onOpenAiTools={openStudentTools} />
                    </div>

                    {/* 6. Roadmap Preview */}
                    <div className="relative w-full pb-2">
                      <RoadmapPreview
                        onNavigate={(target) => {
                          if (target === 'smart-search') { setGlobalSearchQuery(''); setSelectedCategory('all'); setActiveTab('search'); setIsSmartSearchOpen(true); }
                          if (target === 'scholarships') { setSearchQuery(''); setSelectedCategory('scholarships'); setActiveTab('search'); }
                          if (target === 'exams') { setSearchQuery(''); setSelectedCategory('exams'); setActiveTab('search'); }
                          if (target === 'tools') { openStudentTools(); }
                          if (target === 'student') { setActiveTab('account'); }
                          window.scrollTo({ top: 0, behavior: 'instant' });
                        }}
                      />
                    </div>

                    {/* 7. Featured Exams */}
                    <div className="relative w-full">
                      <FeaturedExams
                        exams={exams}
                        onSelectExam={setSelectedExam}
                        onViewAllClick={() => {
                          setActiveTab('search');
                          setSelectedCategory('exams');
                        }}
                      />
                    </div>

                    {/* 8. Featured Courses */}
                    <div className="relative w-full">
                      <FeaturedCourses
                        courses={courses}
                        onSelectCourse={(course) => { setSelectedImportedCourse(null); setSelectedCourse(course); navigate({activeTab: 'search', selectedCategory: 'courses', selectedCourseTrack: course.accessType === 'PAID' ? 'paid' : 'native', selectedCourse: course}); }}
                        onViewAllClick={() => {
                          setActiveTab('search');
                          setSelectedCategory('courses');
                        }}
                      />
                    </div>

                    {/* 10. Featured Articles (Magazine Style) */}
                    <div className="relative w-full">
                      <FeaturedArticles
                  articles={articles}
                  onSelectArticle={(id) => {
                    const article = articles.find(item => item.id === id);
                    if (article) setSelectedArticle(article); else openSection('articles');
                  }}
                        onViewAllClick={() => {
                          setActiveTab('search');
                          setSelectedCategory('articles');
                          setSearchQuery('');
                        }}
                      />
                    </div>

                    {/* 11. Featured Services (Students & General Support) */}
                    <div className="relative w-full">
                      <FeaturedServices
                        services={services}
                        onViewAllClick={() => {
                          setSelectedServiceTrack(null);
                          setSearchQuery('');
                          setActiveTab('search');
                          setSelectedCategory('services');
                          window.scrollTo({ top: 0, behavior: 'instant' });
                        }}
                        onSelectService={(service) => {
                          setServiceReturnTab(null);
                          setSelectedServiceTrack(service.audience);
                          setSelectedCategory('services');
                          setActiveTab('search');
                          setSelectedService(service);
                          window.scrollTo({ top: 0, behavior: 'instant' });
                        }}
                      />
                    </div>

                    {/* 12. Featured Jobs & Internships (Placed after Services) */}
                    <div className="relative w-full pb-2">
                      <FeaturedJobs
                        onViewAllClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('jobs');
                          setActiveTab('search');
                          window.scrollTo({ top: 0, behavior: 'instant' });
                        }}
                      />
                    </div>

                    {/* 12. FAQ Preview */}
                    <div className="relative w-full pb-2">
                      <FaqPreview onOpen={() => navigate({auxiliaryPage: 'faq'})} />
                    </div>

                    {/* 13. Contact & Branches Section */}
                    <div className="relative w-full pb-4">
                      <ContactSection onOpen={() => navigate({auxiliaryPage: 'contact'})} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SEARCH / DIRECTORY VIEW */}
            {activeTab === 'search' && selectedCategory === 'all' ? (
              <GlobalSearchPage
                query={globalSearchQuery}
                searchMode={publicDataMode}
                locale={language}
                scholarships={scholarships}
                universities={universities}
                majors={majors}
                countries={countriesForView}
                importedCourses={importedCourses}
                exams={exams}
                articles={articles}
                services={services}
                tools={tools}
                careers={careers}
                onBack={goBack}
                onOpenSmartSearch={() => setIsSmartSearchOpen(true)}
                onOpenScholarship={(item, target) => navigate({ activeTab: 'search', selectedCategory: 'all', selectedScholarship: item, detailSearchAnchor: target?.anchor || '', detailSearchTerm: target?.searchTerm || '' })}
                onOpenUniversity={(item, target) => navigate({ activeTab: 'search', selectedCategory: 'all', selectedUniversity: item, detailSearchAnchor: target?.anchor || '', detailSearchTerm: target?.searchTerm || '' })}
                onOpenMajor={(item, target) => navigate({ activeTab: 'search', selectedCategory: 'all', selectedMajor: item, detailSearchAnchor: target?.anchor || '', detailSearchTerm: target?.searchTerm || '' })}
                onOpenExam={(item, target) => navigate({ activeTab: 'search', selectedCategory: 'all', selectedExam: item, detailSearchAnchor: target?.anchor || '', detailSearchTerm: target?.searchTerm || '' })}
                onOpenCourse={(item, target) => navigate({ activeTab: 'search', selectedCategory: 'all', selectedImportedCourse: item, detailSearchAnchor: target?.anchor || '', detailSearchTerm: target?.searchTerm || '' })}
                onOpenArticle={(item, target) => navigate({ activeTab: 'search', selectedCategory: 'all', selectedArticle: item, detailSearchAnchor: target?.anchor || '', detailSearchTerm: target?.searchTerm || '' })}
                onOpenService={(item, target) => navigate({ activeTab: 'search', selectedCategory: 'all', selectedServiceTrack: item.audience, selectedService: item, detailSearchAnchor: target?.anchor || '', detailSearchTerm: target?.searchTerm || '' })}
                onOpenCountry={(countryId, target) => navigate({ activeTab: 'search', selectedCategory: 'countries', nestedDetailId: countryId, detailSearchAnchor: target?.anchor || '', detailSearchTerm: target?.searchTerm || '' })}
                onNavigateCategory={(category, targetId, target) => navigate({
                  activeTab: category === 'tools' ? 'ai-tools' : 'search',
                  selectedCategory: category,
                  nestedDetailId: targetId || '',
                  detailSearchAnchor: target?.anchor || '',
                  detailSearchTerm: target?.searchTerm || '',
                })}
                favoriteKeys={favoriteKeys}
                onToggleFavorite={handleToggleFavorite}
              />
            ) : (activeTab === 'search' || (activeTab === 'home' && selectedCategory !== 'all')) &&
            selectedCategory === 'scholarships' ? (
              <ScholarshipsSearchPage
                scholarships={scholarships}
                dataStatus={scholarshipDataStatus}
                initialCountryReferenceId={selectedCountry !== 'الكل' ? selectedCountry : undefined}
                onBack={goBack}
                onSelectScholarship={setSelectedScholarship}
                favoriteIds={favoriteIdsFor('scholarship')}
                onToggleFavorite={(id) => handleToggleFavorite('scholarship', id)}
              />
            ) : (activeTab === 'search' || (activeTab === 'home' && selectedCategory !== 'all')) &&
              selectedCategory === 'majors' ? (
              <MajorsSearchPage
                majors={majors}
                favoriteIds={favoriteIdsFor('major')}
                onToggleFavorite={(id) => handleToggleFavorite('major', id)}
                onBack={goBack}
                onSelectMajor={setSelectedMajor}
              />
            ) : (activeTab === 'search' || (activeTab === 'home' && selectedCategory !== 'all')) &&
              selectedCategory === 'countries' ? (
              <CountriesSearchPage detailId={navigation.state.nestedDetailId} onDetailChange={(id) => navigation.field('nestedDetailId')[1](id)}
                searchAnchor={detailSearchAnchor}
                searchTerm={detailSearchTerm}
                countries={countriesForView}
                relationshipGraph={publicGraph.country}
                initialCountryIdentity={countryNavigationName}
                onBack={goBack}
                onSelectCountryScholarships={(countryId) => {
                  setSelectedCountry(countryId);
                  setCountryNavigationName('');
                  setSelectedCategory('scholarships');
                  setActiveTab('search');
                }}
                onOpenUniversity={(universityId) => {
                  void openPublishedUniversityByIdentity(
                    universityId,
                    publicGraph.country?.relationships.universities.data ?? [],
                  );
                }}
                onOpenScholarship={(scholarshipId) => {
                  void openPublishedScholarshipByIdentity(
                    scholarshipId,
                    publicGraph.country?.relationships.scholarships.data ?? [],
                  );
                }}
                onOpenMajor={(majorId) => {
                  void openPublishedMajorByIdentity(majorId);
                }}
                onOpenExam={(examId) => {
                  const exam = exams.find((item) => item.id === examId);
                  if (!exam) return;
                  setCountryNavigationName('');
                  setSelectedUniversity(null);
                  setSelectedScholarship(null);
                  setSelectedMajor(null);
                  setSelectedExam(exam);
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                onOpenArticle={(articleId) => {
                  const article = articles.find((item) => item.id === articleId);
                  if (!article) return;
                  setCountryNavigationName('');
                  setSelectedArticle(article);
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                favoriteIds={favoriteIdsFor('country')}
                onToggleFavorite={(id) => handleToggleFavorite('country', id)}
              />
            ) : (activeTab === 'search' || (activeTab === 'home' && selectedCategory !== 'all')) &&
              selectedCategory === 'universities' ? (
              <UniversitiesSearchPage
                universities={universities}
                favoriteIds={favoriteIdsFor('university')}
                onToggleFavorite={(id) => handleToggleFavorite('university', id)}
                onBack={goBack}
                onSelectUniversity={(uni) => {
                  setSelectedUniversity(uni);
                }}
              />
            ) : (activeTab === 'search' || (activeTab === 'home' && selectedCategory !== 'all')) &&
              selectedCategory === 'exams' ? (
              <ExamsSearchPage
                exams={exams}
                initialQuery={examNavigationQuery}
                onBack={goBack}
                onSelectExam={(exam) => {
                  setSelectedExam(exam);
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                favoriteIds={favoriteIdsFor('exam')}
                onToggleFavorite={(id) => handleToggleFavorite('exam', id)}
              />
            ) : (activeTab === 'search' || (activeTab === 'home' && selectedCategory !== 'all')) &&
              selectedCategory === 'articles' ? (
              <ArticlesSearchPage
                articles={articles}
                onBack={goBack}
                onSelectArticle={(article) => {
                  setSelectedArticle(article);
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                favoriteIds={favoriteIdsFor('article')}
                onToggleFavorite={(id) => handleToggleFavorite('article', id)}
              />
            ) : (activeTab === 'search' || (activeTab === 'home' && selectedCategory !== 'all')) &&
              selectedCategory === 'jobs' ? (
              <CareersSearchPage opportunities={careersForView} detailId={navigation.state.nestedDetailId} onDetailChange={(id) => navigation.field('nestedDetailId')[1](id)} searchAnchor={detailSearchAnchor} searchTerm={detailSearchTerm}
                onBack={goBack}
                onNavigateCategory={(category) => {
                  setFavoriteLaunch(null);
                  setSelectedCategory(category);
                  setActiveTab('search');
                  setSearchQuery('');
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                onOpenCountry={(countryId) => {
                  setFavoriteLaunch(null);
                  setCountryNavigationName(countryId);
                  setSelectedCategory('countries');
                  setActiveTab('search');
                  setSearchQuery('');
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                onOpenTools={() => {
                  setFavoriteLaunch(null);
                  setActiveTab('ai-tools');
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                favoriteIds={favoriteIdsFor('career')}
                onToggleFavorite={(id) => handleToggleFavorite('career', id)}
                initialSelectedId={favoriteLaunch?.kind === 'career' ? favoriteLaunch.id : undefined}
              />
            ) : (activeTab === 'search' || (activeTab === 'home' && selectedCategory !== 'all')) &&
              selectedCategory === 'services' ? (
              selectedServiceTrack ? (
                <ServicesDirectoryPage
                  services={services}
                  audience={selectedServiceTrack}
                  onBack={goBack}
                  onSelectService={(service) => {
                    setServiceReturnTab(null);
                    setSelectedService(service);
                    window.scrollTo({ top: 0, behavior: 'instant' });
                  }}
                  favoriteIds={favoriteIdsFor('service')}
                  onToggleFavorite={(id) => handleToggleFavorite('service', id)}
                />
              ) : (
                <ServicesLandingPage
                  onBack={goBack}
                  onOpenTrack={(track) => {
                    setSelectedServiceTrack(track);
                    window.scrollTo({ top: 0, behavior: 'instant' });
                  }}
                />
              )
            ) : (activeTab === 'search' || (activeTab === 'home' && selectedCategory !== 'all')) &&
              selectedCategory === 'courses' ? (
              selectedCourseTrack === 'native' || selectedCourseTrack === 'paid' ? (
                <CourseTrackPreview
                  track={selectedCourseTrack}
                  courses={selectedCourseTrack === 'native' ? courses.filter((course) => publicDataMode === 'api' || course.provider.includes('منارتك')) : paidCourses}
                  favoriteIds={favoriteKeys.filter((k) => k.startsWith('course:')).map((k) => k.replace(/^course:/, ''))}
                  onToggleFavorite={(id) => handleToggleFavorite('course', id)}
                  onBack={goBack}
                  onSelectCourse={(course) => { setSelectedImportedCourse(null); setSelectedCourse(course); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                />
              ) : selectedCourseTrack === 'imported' ? (
                <CoursesSearchPage
                  importedCourses={importedCourses}
                  initialQuery={searchQuery}
                  initialField={courseNavigationField}
                  onSelectCourse={(course) => {
                    setSelectedImportedCourse(course);
                    window.scrollTo({ top: 0, behavior: 'instant' });
                  }}
                  onBack={goBack}
                  favoriteIds={favoriteIdsFor('course')}
                  onToggleFavorite={(id) => handleToggleFavorite('course', id)}
                />
              ) : (
                <CoursesLandingPage
                  onBack={goBack}
                  onOpenTrack={(track) => {setCourseNavigationField(''); setSearchQuery(''); setSelectedCourseTrack(track);}}
                />
              )
            ) : (
              (activeTab === 'search' || (activeTab === 'home' && selectedCategory !== 'all')) && (
                <div className="w-full max-w-4xl lg:max-w-5xl mx-auto mn-inline-gutter py-2 sm:pt-3 space-y-3">
                  {/* Search Bar at Top */}
                  <SmartSearchBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onSelectTag={setSearchQuery}
                    selectedCountry={selectedCountry}
                    onSelectCountry={setSelectedCountry}
                    onOpenAiTools={() => openStudentTools()}
                  />

                  {/* Category Quick Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {[
                      { id: 'scholarships', label: 'المنح الدراسية', icon: GraduationCap },
                      { id: 'universities', label: 'الجامعات', icon: Building2 },
                      { id: 'exams', label: 'الاختبارات', icon: ClipboardCheck },
                      { id: 'courses', label: 'الدورات', icon: BookOpen },
                      { id: 'majors', label: 'التخصصات', icon: BriefcaseBusiness },
                    ].map((item) => {
                      const ItemIcon = item.icon;
                      return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCountryNavigationName('');
                          setExamNavigationQuery('');
                          setSelectedCategory(item.id as any);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all inline-flex items-center gap-1.5 ${
                          selectedCategory === item.id ||
                          (selectedCategory === 'all' && item.id === 'scholarships')
                            ? 'bg-[var(--mn-primary)] text-[var(--mn-accent-soft)] shadow-xs mn-inverse '
                            : 'bg-[var(--mn-surface-muted)] border border-[var(--mn-border)] text-[var(--mn-text)] hover:bg-[var(--mn-page)] mn-panel hover:mn-panel '
                        }`}
                      >
                        <ItemIcon className="h-3.5 w-3.5 shrink-0" />
                        {item.label}
                      </button>
                      );
                    })}
                  </div>

                  {/* Specific Category View Dispatcher */}
                  {selectedCategory === 'universities' ? (
                    <UniversitiesList universities={universities} onSelectUniversity={setSelectedUniversity} />
                  ) : selectedCategory === 'courses' ? (
                    <CoursesList courses={courses} />
                  ) : selectedCategory === 'articles' ? (
                    <div className="pt-2">
                      <FeaturedArticles articles={articles} onViewAllClick={() => openSection('articles')} onSelectArticle={id => {
                        const article = articles.find(item => item.id === id);
                        if (article) setSelectedArticle(article);
                      }} />
                    </div>
                  ) : selectedCategory === 'services' ? (
                    <div className="pt-2">
                      <FeaturedServices services={services} />
                    </div>
                  ) : selectedCategory === 'exams' ? (
                    <div className="pt-2">
                      <FeaturedExams
                        exams={exams}
                        onViewAllClick={() => setSelectedCategory('exams')}
                      />
                    </div>
                  ) : selectedCategory === 'jobs' ? (
                    <div className="pt-2">
                      <FeaturedJobs onViewAllClick={() => setSelectedCategory('jobs')} />
                    </div>
                  ) : selectedCategory === 'tools' ? (
                    <div className="pt-2">
                      <AIToolsBanner onOpenAiTools={openStudentTools} />
                    </div>
                  ) : (
                    /* Scholarships Cards List */
                    <div className="space-y-3 pt-1">
                      {/* Results Count & Filter Bar */}
                      <div className="flex items-center justify-between text-xs text-[var(--mn-text-muted)] font-bold px-1">
                        <span>{filteredScholarships.length} فرصة دراسية متاحة</span>
                        <button
                          onClick={() => {
                            setOnlyFullyFunded(!onlyFullyFunded);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                            onlyFullyFunded
                              ? 'bg-[var(--mn-accent)] text-[var(--mn-on-accent)] border-[var(--mn-border-gold)] mn-gold '
                              : 'bg-[var(--mn-surface-muted)] text-[var(--mn-text)] border-[var(--mn-border)] mn-panel '
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5"><BadgeDollarSign className="h-3.5 w-3.5" aria-hidden="true" />ممولة بالكامل فقط</span>
                        </button>
                      </div>

                      {filteredScholarships.length === 0 ? (
                        <div className="py-16 text-center text-[var(--mn-text-muted)] text-xs space-y-2">
                          <GraduationCap className="w-10 h-10 mx-auto text-[var(--mn-text-muted)]" />
                          <p className="font-bold">لم نجد منحاً تطابق معايير البحث الحالية.</p>
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setSelectedCountry('الكل');
                              setOnlyFullyFunded(false);
                              setOnlyWithoutIelts(false);
                            }}
                            className="px-4 py-1.5 bg-[var(--mn-primary)] text-[var(--mn-accent-soft)] rounded-xl text-xs font-bold mn-inverse "
                          >
                            إعادة ضبط الفلاتر
                          </button>
                        </div>
                      ) : (
                        filteredScholarships.map((sch) => {
                          const isFavorited = isFavorite('scholarship', sch.id);

                          return (
                            <div
                              key={sch.id}
                              role="button"
                              tabIndex={0}
                              onKeyDown={function (event) {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  setSelectedScholarship(sch);
                                }
                              }}
                              onClick={() => setSelectedScholarship(sch)}
                              className="bg-[var(--mn-surface-muted)] rounded-2xl border border-[var(--mn-border)] shadow-xs hover:shadow-md transition-all overflow-hidden p-3.5 space-y-2.5 text-right hover:border-[var(--mn-border-gold)] cursor-pointer active:scale-99 mn-panel "
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <img
                                    src={sch.imageUrl}
                                    alt={sch.title}
                                    className="w-14 h-14 rounded-xl object-cover border border-[var(--mn-border)] shrink-0"
                                  />
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-2 py-0.5 rounded-full bg-[var(--mn-gold-surface)] text-[var(--mn-heading)] font-bold text-[9px] mn-panel ">
                                        {sch.fundingType}
                                      </span>
                                      <span className="text-xs">
                                        {sch.countryFlag} {sch.country}
                                      </span>
                                    </div>
                                    <h3 className="text-xs font-bold text-[var(--mn-heading)] mt-1 leading-snug">
                                      {sch.title}
                                    </h3>
                                    <p className="text-[10px] text-[var(--mn-text-muted)] font-semibold mt-0.5">
                                      {sch.university}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleFavorite('scholarship', sch.id);
                                  }}
                                  className="p-1.5 text-[var(--mn-text-muted)] hover:text-[var(--mn-accent-text)] rounded-lg"
                                >
                                  <Heart
                                    className={`w-4 h-4 ${
                                      isFavorited
                                        ? 'fill-[var(--mn-accent-soft)] text-[var(--mn-accent-soft)]'
                                        : 'text-[var(--mn-text-muted)]'
                                    }`}
                                  />
                                </button>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-[var(--mn-border)] text-[11px]">
                                <div className="flex items-center gap-2 text-[var(--mn-text-muted)] font-semibold">
                                  <span className="flex items-center gap-1 text-[var(--mn-danger-text)] font-bold">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {sch.daysLeft} يوم متبقي
                                  </span>
                                  <span>•</span>
                                  <span>{sch.degreeLevel.join(', ')}</span>
                                </div>

                                <span className="text-[11px] font-semibold text-[var(--mn-heading)] flex items-center gap-1">
                                  <span>التفاصيل والشروط</span>
                                  <ChevronLeft className="w-3 h-3 text-[var(--mn-accent-text)]" />
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )
            )}

            {/* TAB 3: FAVORITES VIEW */}
            {activeTab === 'favorites' && (
              publicDataMode === 'api' ? (
                <LiveStudentWorkspacePage initialTab="VAULT" />
              ) : (
              <FavoritesPage
                favoriteKeys={favoriteKeys}
                scholarships={scholarships}
                universities={universities}
                majors={majors}
                countries={countriesForView}
                importedCourses={importedCourses}
                exams={exams}
                articles={articles}
                services={services}
                tools={tools}
                careers={careers}
                onToggleFavorite={handleToggleFavorite}
                onOpenScholarship={setSelectedScholarship}
                onOpenUniversity={setSelectedUniversity}
                onOpenMajor={setSelectedMajor}
                onOpenCountry={(countryId) => {
                  const country = countries.find((item) => item.id === countryId);
                  setFavoriteLaunch({ kind: 'country', id: country?.id });
                  setCountryNavigationName(countryId);
                  setSelectedCategory('countries');
                  setActiveTab('search');
                }}
                onOpenCourse={setSelectedImportedCourse}
                onOpenExam={setSelectedExam}
                onOpenArticle={setSelectedArticle}
                onOpenService={(service) => {
                  setServiceReturnTab('favorites');
                  setSelectedService(service);
                }}
                onOpenTool={(id) => {
                  setFavoriteLaunch({ kind: 'tool', id });
                  setActiveTab('ai-tools');
                  setSelectedCategory('all');
                }}
                onOpenCareer={(id) => {
                  setFavoriteLaunch({ kind: 'career', id });
                  setSelectedCategory('jobs');
                  setActiveTab('search');
                }}
                onNavigateCategory={(category) => {
                  setSelectedCategory(category);
                  setActiveTab(category === 'tools' ? 'ai-tools' : 'search');
                }}
              />
              )
            )}

            {/* TAB 4: SMART AI TOOLS VIEW */}
            {activeTab === 'ai-tools' && (
              <AIToolsPage tools={tools} detailId={navigation.state.nestedDetailId} onDetailChange={(id) => navigation.field('nestedDetailId')[1](id)} searchAnchor={detailSearchAnchor} searchTerm={detailSearchTerm}
                onBack={goBack}
                onNavigateCategory={(category) => {
                  setFavoriteLaunch(null);
                  setSelectedCategory(category);
                  setActiveTab('search');
                  setSearchQuery('');
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                onOpenService={(serviceId) => {
                  const service = services.find((item) => item.id === serviceId);
                  if (!service) return;
                  setServiceReturnTab('ai-tools');
                  setSelectedServiceTrack(service.audience);
                  setSelectedService(service);
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                favoriteIds={favoriteIdsFor('tool')}
                onToggleFavorite={(id) => handleToggleFavorite('tool', id)}
                initialSelectedId={favoriteLaunch?.kind === 'tool' ? favoriteLaunch.id : undefined}
              />
            )}

            {/* TAB: STUDENT WORKSPACE / P15 LIVE API OR EXPLICIT PROTOTYPE */}
            {activeTab === 'account' && (
              publicDataMode === 'api' ? (
                <LiveStudentWorkspacePage />
              ) : (
                <PrototypeStudentWorkspacePage
                  profile={null}
                  language={language}
                  isDarkMode={isDarkMode}
                  favoriteTypeCounts={favoriteTypeCounts}
                  favoritesCount={favoriteKeys.length}
                  milestones={milestones}
                  notifications={notifications}
                  onOpenFavorites={() => { setActiveTab('favorites'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                  onOpenTracker={() => { setActiveTab('account'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                  onOpenNotifications={() => setIsNotificationOpen(true)}
                  onOpenGlobalSearch={() => { setGlobalSearchQuery(''); setSelectedCategory('all'); setIsSmartSearchOpen(false); setActiveTab('search'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                  onOpenSmartSearch={() => { setGlobalSearchQuery(''); setSelectedCategory('all'); setActiveTab('search'); setIsSmartSearchOpen(true); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                  onOpenTools={() => { setActiveTab('ai-tools'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                  onOpenAuth={() => { setActiveTab('auth'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                  onToggleLanguage={openLanguage}
                  onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
                />
              )
            )}

            {activeTab === 'auth' && (
              publicDataMode === 'api' ? (
                <LiveStudentAuthPage onAuthenticated={(destination) => {
                  if (destination.kind === 'admin') {
                    window.location.assign(destination.path);
                    return;
                  }
                  const postLoginReturn = consumePostLoginReturn();
                  if (postLoginReturn) {
                    window.location.assign(postLoginReturn);
                    return;
                  }
                  setActiveTab('account');
                  window.history.replaceState({...window.history.state}, '', '/student');
                }} />
              ) : (
                <div className="w-full max-w-4xl lg:max-w-5xl mx-auto flex items-center justify-center min-h-[70vh]">
                  <PrototypeAuthPage onBackToWorkspace={goBack} />
                </div>
              )
            )}
        {activeTab === 'tracker' && (
          publicDataMode === 'api' ? (
            <LiveStudentWorkspacePage initialTab="JOURNEY" />
          ) : (
            <div className="w-full max-w-4xl lg:max-w-5xl mx-auto">
              <LearnerProgressTracker
                milestones={milestones}
                onUpdateMilestone={(updated) => setMilestones((prev) => prev.map((m) => m.id === updated.id ? updated : m))}
                onAddMilestone={(newM) => setMilestones((prev) => [newM, ...prev])}
                onDeleteMilestone={(id) => setMilestones((prev) => prev.filter((m) => m.id !== id))}
                allScholarships={scholarships}
                courses={courses}
                onOpenAiLetterForScholarship={() => openStudentTools('motivation-letter-generator')}
                onOpenScholarshipDetails={(sch) => setSelectedScholarship(sch)}
              />
            </div>
          )
        )}
          </>
        )}
        </React.Suspense>
      </main>

      {/* Bottom Docked Navigation Bar (Always Visible) */}
      {publicDataMode === 'prototype' && (
        <p className="text-center text-xs text-[var(--mn-text-muted)] py-2" role="status">
          وضع تجريبي محلي — بيانات غير إنتاجية
        </p>
      )}
      <BottomNavBar
        activeTab={activeTab}
        onTabChange={(tab) => tab === 'notifications' ? (publicDataMode === 'api' ? openSection('account') : setIsNotificationOpen(true)) : openSection(tab)}
        favoritesCount={favoriteKeys.length}
        unreadNotificationsCount={unreadNotificationsCount}
        isNotificationsOpen={isNotificationOpen}
      />

      {/* Slide-out Navigation Drawer Menu */}
      <NavigationDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        userProfile={null}
        language={language}
        onToggleLanguage={openLanguage}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        onNavigate={openSection}
        unreadCount={unreadNotificationsCount}
      />

      {/* Push Notification Center & Dropdown Toast */}
      {publicDataMode === 'prototype' && <PushNotificationCenter
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        onMarkAsRead={(id) => {
          setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        }}
        onMarkAllAsRead={() => {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }}
        onTriggerTestPush={() => triggerInstantPush()}
        onSelectAction={(actionType, targetId) => {
          if (actionType === 'scholarship' && targetId) {
            const found = scholarships.find((s) => s.id === targetId);
            if (found) setSelectedScholarship(found);
            else triggerInstantPush({title: 'الفرصة غير متاحة في هذه المعاينة', body: 'يمكنك استكشاف الفرص المتاحة من البحث العام. لم نفتح فرصة مختلفة بدلًا منها.', type: 'system'});
          } else if (actionType === 'ai-tools') {
            openSection('ai-tools');
          } else if (actionType === 'tracker') {
            openSection('tracker');
          }
        }}
        activeToast={activeToast}
        onDismissToast={() => setActiveToast(null)}
      />}

    </div>
  );
}
