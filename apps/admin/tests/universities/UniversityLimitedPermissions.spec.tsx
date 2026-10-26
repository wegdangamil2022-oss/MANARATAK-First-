import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
const state = vi.hoisted(() => ({
  request: vi.fn(),
  languages: vi.fn(),
  degrees: vi.fn(),
  majors: vi.fn(),
  tests: vi.fn(),
  countries: vi.fn(),
}));
vi.mock('../../src/api/client', () => ({
  adminApiClient: { request: state.request },
  createAdminIdempotencyKey: () => 'isolated-permission-test',
}));
vi.mock('../../src/api/canonicalPickers', () => ({
  canonicalPickerApi: {
    languages: state.languages,
    degreeLevels: state.degrees,
    majors: state.majors,
    tests: state.tests,
    countries: state.countries,
  },
}));
vi.mock('../../src/i18n/I18nProvider', () => ({ useTranslation: () => ({ language: 'en' }) }));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({
    hasPermission: (required: string) => required === 'admin:universities:manage',
  }),
}));
vi.mock('../../src/components/CanonicalPicker', () => ({
  CanonicalPicker: ({ load, label }: { load: () => Promise<unknown>; label: string }) => {
    React.useEffect(() => {
      void load();
      }, [load]);
    return <span>{label}</span>;
  },
}));
vi.mock('../../src/features/integration/AdmissionRequirementScoreEditor', () => ({
  AdmissionRequirementScoreEditor: () => {
    throw Error('FORBIDDEN_TEST_REFERENCE_READ');
  },
}));
import { UniversityProgramStudyEditor } from '../../src/components/UniversityProgramWorkspace';
import { UniversityProgramsCard } from '../../src/features/universities/UniversityProgramsCard';
import { UniversityLocationCard } from '../../src/features/universities/UniversityLocationCard';
let tree: ReactTestRenderer;
const text = (value: unknown): string =>
  typeof value === 'string'
    ? value
    : Array.isArray(value)
      ? value.map(text).join('')
      : value && typeof value === 'object' && 'children' in value
        ? text(value.children)
        : '';
const program = {
  id: 'p',
  universityId: 'u',
  parentRevision: 1,
  parentStatus: 'READY_TO_REVIEW',
  sourceProgramName: 'Saved program',
  intakes: [],
  study: {
    languageReferenceIds: ['saved-language'],
    studyMode: 'FULL_TIME',
    teachingDelivery: 'ON_CAMPUS',
    durationValue: 48,
    durationUnit: 'MONTHS',
    entryEligibility: '',
    officialSourceUrl: 'https://example.org/source',
    verificationStatus: 'VERIFIED',
  },
};
beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  state.request.mockResolvedValue({ items: [program] });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
describe('University editors with only owner permission', () => {
  it('loads the exact study editor without forbidden reference requests, preserves language IDs and verifies saved values', async () => {
    const saved = vi.fn();
    await act(async () => {
      tree = create(
        <UniversityProgramStudyEditor
          universityId="u"
          programId="p"
          onDirtyChange={() => {}}
          onSaved={saved}
        />,
      );
    });
    expect(state.languages).not.toHaveBeenCalled();
    expect(text(tree!.toJSON())).toContain('Existing links are preserved');
    const language = tree!.root.findAllByType('select').find((node) => node.props.multiple)!;
    expect(language.props.disabled).toBe(true);
    expect(language.props.value).toEqual(['saved-language']);
    await act(async () =>
      tree!.root
        .findAllByType('input')
        .find((node) => node.props.maxLength === 2000)!
        .props.onChange({ target: { value: 'Documented change reason' } }),
    );
    state.request.mockImplementation(async (_path: string, options?: { method?: string }) =>
      options?.method
        ? {}
        : {
            items: [
              { ...program, parentRevision: 2, study: { ...program.study, durationValue: 99 } },
            ],
          },
    );
    const save = () =>
      tree!.root
        .findAllByType('button')
        .find((node) => text(node) === 'Save study profile')!
        .props.onClick();
    await act(async () => save());
    expect(saved).not.toHaveBeenCalled();
    expect(text(tree!.toJSON())).toContain('Not saved');
    const write = state.request.mock.calls.find(([, options]) => options?.method === 'PUT');
    expect(JSON.parse(write![1].body).languageReferenceIds).toEqual(['saved-language']);
    state.request.mockImplementation(async (_path: string, options?: { method?: string }) =>
      options?.method ? {} : { items: [{ ...program, parentRevision: 2 }] },
    );
    await act(async () => save());
    expect(saved).toHaveBeenCalledOnce();
  });
  it('keeps degree, major and test relationships without reading forbidden reference contracts', async () => {
    await act(async () => {
      tree = create(
        <UniversityProgramsCard
          university={{
            id: 'u',
            revision: 1,
            publicId: 'U',
            displayName: 'University',
            status: 'READY_TO_REVIEW',
            academicPrograms: [
              {
                id: 'p',
                sourceProgramName: 'Saved program',
                degreeLevelId: 'degree',
                majorId: 'major',
                status: 'DRAFT',
                campusIds: [],
                admissionRequirements: [{ internationalTestId: 'test', status: 'ACTIVE' }],
              },
            ],
          }}
          ar={false}
          editingId="program-p"
          busy={false}
          disabled={false}
          requestEdit={() => {}}
          cancel={() => {}}
          onDirty={() => {}}
          commit={vi.fn()}
          confirm={() => {}}
          onSaved={async () => {}}
          onBusyChange={() => {}}
        />,
      );
    });
    expect(state.degrees).not.toHaveBeenCalled();
    expect(state.majors).not.toHaveBeenCalled();
    expect(state.tests).not.toHaveBeenCalled();
    expect(text(tree!.toJSON())).toContain('saved relationship is retained');
    expect(
      tree!.root.findAllByType('button').find((node) => text(node) === 'Add test requirement')!
        .props.disabled,
    ).toBe(true);
  });
  it('does not mount geographic loaders without reference permission', async () => {
    await act(async () => {
      tree = create(
        <UniversityLocationCard
          university={{
            id: 'u',
            revision: 1,
            publicId: 'U',
            displayName: 'University',
            status: 'READY_TO_REVIEW',
            countryReferenceId: 'country',
          }}
          ar={false}
          editing
          busy={false}
          disabled={false}
          onEdit={() => {}}
          onCancel={() => {}}
          onDirty={() => {}}
          commit={vi.fn()}
        />,
      );
    });
    expect(state.countries).not.toHaveBeenCalled();
    expect(text(tree!.toJSON())).toContain('requires reference-data permission');
  });
});
