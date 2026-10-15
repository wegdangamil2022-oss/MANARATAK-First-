import {
  publicRelationshipRouteKey,
  shouldRefreshPublicGraph,
} from './PublicGraphNavigationPolicy';
import { useEffect, useMemo, useState } from 'react';
import {
  ApiClient,
  type PublicCountryGraphDto,
  type PublicMajorGraphDto,
  type PublicScholarshipGraphDto,
  type PublicUniversityGraphDto,
  type StablePublicGraphIdentity,
} from '../../api/client';
import type { PublicTemplateDataMode } from './publicScholarshipDataSource';

export interface MajorPublicRelationshipGraph {
  universities: Array<{ id: string; ownerId: string; name: string; meta: string }>;
  scholarships: Array<{ id: string; ownerId: string; name: string; meta: string }>;
  courses: Array<{ id: string; ownerId: string; name: string; meta: string }>;
}

export interface PublicRelationshipGraphState {
  major?: PublicMajorGraphDto;
  university?: PublicUniversityGraphDto;
  scholarship?: PublicScholarshipGraphDto;
  country?: PublicCountryGraphDto;
  loading: boolean;
  error?: string;
  stale?: boolean;
  partial?: boolean;
  routeUnavailableCount?: number;
}

function identityRouteKey(identity: StablePublicGraphIdentity): string {
  return publicRelationshipRouteKey(identity) ?? '';
}

export function usePublicRelationshipGraph(
  mode: PublicTemplateDataMode,
  selected: { majorSlug?: string; universitySlug?: string; scholarshipSlug?: string; countryIso2Code?: string;
    locale?: string },
): PublicRelationshipGraphState & { majorView?: MajorPublicRelationshipGraph } {
  const [state, setState] = useState<PublicRelationshipGraphState>({ loading: false });

  useEffect(() => {
    let active = true;
    let generation = 0;
    let capturedAt = 0;
    let controller: AbortController | undefined;
    if (mode !== 'api') {
      setState({ loading: false });
      return () => { active = false; };
    }

    const load = async () => {
      const request = ++generation;
      controller?.abort();
      controller = new AbortController();
      setState((previous) => ({ ...previous, loading: true }));
      try {
        if (selected.majorSlug) {
          const major = await ApiClient.getMajorGraph(selected.majorSlug, 1, 24, controller.signal, selected.locale === 'en' ? 'en' : 'ar');
          if (active && request === generation) setState({ major, loading: false });
          return;
        }
        if (selected.universitySlug) {
          const university = await ApiClient.getUniversityGraph(selected.universitySlug, 1, 24,
            controller.signal, selected.locale === 'en' ? 'en' : 'ar',
          );
          if (active && request === generation) setState({ university, loading: false });
          return;
        }
        if (selected.scholarshipSlug) {
          const scholarship = await ApiClient.getScholarshipGraph(selected.scholarshipSlug,
            controller.signal, selected.locale === 'en' ? 'en' : 'ar',
          );
          if (active && request === generation) setState({ scholarship, loading: false });
          return;
        }
        if (selected.countryIso2Code) {
          const country = await ApiClient.getCountryGraph(selected.countryIso2Code, 1, 24,
            controller.signal, selected.locale === 'en' ? 'en' : 'ar',
          );
          if (active && request === generation) setState({ country, loading: false });
          return;
        }
        if (active && request === generation) setState({ loading: false });
      } catch (error) {
        if (active && request === generation) setState((previous) => ({
            ...previous,
            loading: false,
            stale: true, error: error instanceof Error ? error.message : 'PUBLIC_GRAPH_UNAVAILABLE' }));
      } finally {
        if (active && request === generation) capturedAt = Date.now();
      }
    };

    setState({ loading: true });

    void load();
    const refresh = () => { if (document.visibilityState !== 'hidden' &&
        shouldRefreshPublicGraph(
          capturedAt,
          Date.now(),
          Boolean(
            selected.countryIso2Code ||
            selected.majorSlug ||
            selected.universitySlug ||
            selected.scholarshipSlug,
          ),
        )
      ) void load(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false;
      controller?.abort();
      ++generation; window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [mode, selected.majorSlug, selected.universitySlug, selected.scholarshipSlug, selected.countryIso2Code,
    selected.locale,
  ]);

  const majorView = useMemo<MajorPublicRelationshipGraph | undefined>(() => {
    if (!state.major) return undefined;
    return {
      universities: state.major.relationships.universities.data
        .filter((identity) => Boolean(publicRelationshipRouteKey(identity)))
        .map((identity) => ({
        id: identityRouteKey(identity), ownerId: identity.ownerId, name: identity.displayName,
        meta: identity.matchingPrograms?.[0]?.sourceProgramName || 'برنامج أكاديمي منشور مرتبط',
      })),
      scholarships: state.major.relationships.scholarships.data.filter((identity) => Boolean(publicRelationshipRouteKey(identity)))
        .map((identity) => ({
        id: identityRouteKey(identity), ownerId: identity.ownerId, name: identity.displayName, meta: 'منحة منشورة مرتبطة بالتخصص',
      })),
      courses: state.major.relationships.courses.data
        .filter((identity) => Boolean(publicRelationshipRouteKey(identity)))
        .map((identity) => ({
        id: identityRouteKey(identity), ownerId: identity.ownerId, name: identity.displayName,
        meta: [identity.providerName, identity.category].filter(Boolean).join(' · ') || 'دورة منشورة مرتبطة بالتخصص',
      })),
    };
  }, [state.major]);

  const graph = state.country ?? state.major ?? state.university ?? state.scholarship;
  const hasLocaleFallback = (value: unknown): boolean => {
    if (!value || typeof value !== 'object') return false;
    if ('localeFallback' in value && value.localeFallback === true) return true;
    return Object.values(value).some(hasLocaleFallback);
  };
  const partial = hasLocaleFallback(graph) ||
    graph?.readScope &&
    Object.values(graph.readScope.collections).some(
      (item) => item.state !== 'AVAILABLE' || item.scope === 'PROGRAM_PAGE_SAMPLE' || item.hasMore,
    );
  const routeUnavailableCount = state.major
    ? [
        state.major.relationships.universities,
        state.major.relationships.scholarships,
        state.major.relationships.courses,
      ].reduce(
        (count, page) =>
          count + page.data.filter((identity) => !publicRelationshipRouteKey(identity)).length,
        0,
      )
    : 0;
  return { ...state, partial: Boolean(partial), routeUnavailableCount, majorView };
}
