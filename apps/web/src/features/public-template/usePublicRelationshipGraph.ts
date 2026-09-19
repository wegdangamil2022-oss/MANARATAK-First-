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
}

function identityRouteKey(identity: StablePublicGraphIdentity): string {
  return identity.slug || identity.publicId || identity.ownerId;
}

export function usePublicRelationshipGraph(
  mode: PublicTemplateDataMode,
  selected: { majorSlug?: string; universitySlug?: string; scholarshipSlug?: string; countryIso2Code?: string },
): PublicRelationshipGraphState & { majorView?: MajorPublicRelationshipGraph } {
  const [state, setState] = useState<PublicRelationshipGraphState>({ loading: false });

  useEffect(() => {
    let active = true;
    if (mode !== 'api') {
      setState({ loading: false });
      return () => { active = false; };
    }

    const load = async () => {
      setState({ loading: true });
      try {
        if (selected.majorSlug) {
          const major = await ApiClient.getMajorGraph(selected.majorSlug, 1, 24);
          if (active) setState({ major, loading: false });
          return;
        }
        if (selected.universitySlug) {
          const university = await ApiClient.getUniversityGraph(selected.universitySlug, 1, 24);
          if (active) setState({ university, loading: false });
          return;
        }
        if (selected.scholarshipSlug) {
          const scholarship = await ApiClient.getScholarshipGraph(selected.scholarshipSlug);
          if (active) setState({ scholarship, loading: false });
          return;
        }
        if (selected.countryIso2Code) {
          const country = await ApiClient.getCountryGraph(selected.countryIso2Code, 1, 24);
          if (active) setState({ country, loading: false });
          return;
        }
        if (active) setState({ loading: false });
      } catch (error) {
        if (active) setState({ loading: false, error: error instanceof Error ? error.message : 'PUBLIC_GRAPH_UNAVAILABLE' });
      }
    };

    void load();
    return () => { active = false; };
  }, [mode, selected.majorSlug, selected.universitySlug, selected.scholarshipSlug, selected.countryIso2Code]);

  const majorView = useMemo<MajorPublicRelationshipGraph | undefined>(() => {
    if (!state.major) return undefined;
    return {
      universities: state.major.relationships.universities.data.map((identity) => ({
        id: identityRouteKey(identity), ownerId: identity.ownerId, name: identity.displayName,
        meta: identity.matchingPrograms?.[0]?.sourceProgramName || 'برنامج أكاديمي منشور مرتبط',
      })),
      scholarships: state.major.relationships.scholarships.data.map((identity) => ({
        id: identityRouteKey(identity), ownerId: identity.ownerId, name: identity.displayName, meta: 'منحة منشورة مرتبطة بالتخصص',
      })),
      courses: state.major.relationships.courses.data.map((identity) => ({
        id: identityRouteKey(identity), ownerId: identity.ownerId, name: identity.displayName,
        meta: [identity.providerName, identity.category].filter(Boolean).join(' · ') || 'دورة منشورة مرتبطة بالتخصص',
      })),
    };
  }, [state.major]);

  return { ...state, majorView };
}
