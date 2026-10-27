import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ request: vi.fn(), denied: new Set<string>(), key: 0 }));
vi.mock('../../src/api/client', () => ({
  adminApiClient: { request: state.request },
  createAdminIdempotencyKey: () => `intent-${++state.key}`,
}));
vi.mock('../../src/i18n/I18nProvider', () => ({
  useTranslation: () => ({ language: 'en', dir: 'ltr' }),
}));
vi.mock('../../src/security/AdminAuthorizationContext', () => ({
  useAdminAuthorization: () => ({
    hasPermission: (permission: string) => !state.denied.has(permission),
  }),
}));
vi.mock('../../src/components/CanonicalPicker', () => ({ CanonicalPicker: () => null }));
vi.mock('../../src/components/CanonicalCityPicker', () => ({ CanonicalCityPicker: () => null }));
vi.mock('../../src/components/AssetPicker', () => ({ AssetPicker: () => null }));
vi.mock('../../src/features/reference-data/useAdministrationDraftGuard', () => ({
  useAdministrationDraftGuard: () => undefined,
}));
import { CareerAdminPage } from '../../src/pages/CareerAdminPage';
let tree: ReturnType<typeof create>, navigate: ReturnType<typeof useNavigate>;
function Nav() {
  navigate = useNavigate();
  return null;
}
async function mount(path: string) {
  await act(async () => {
    tree = create(
      <MemoryRouter initialEntries={[path]}>
        <Nav />
        <CareerAdminPage />
      </MemoryRouter>,
    );
  });
  await act(async () => vi.advanceTimersByTime(300));
}
function button(text: string) {
  return tree.root.findAllByType('button').find((n) => n.children.includes(text))!;
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  state.denied.clear();
  state.key = 0;
  vi.stubGlobal('window', { confirm: vi.fn().mockReturnValue(true) });
  state.request.mockReset().mockResolvedValue({
    data: [{ id: 'app', publicId: 'original-case', version: 1, jobId: 'job', status: 'SUBMITTED' }],
    total: 1,
    totalPages: 1,
  });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('Career case reader boundaries', () => {
  it('removes obsolete rows on failed list refresh', async () => {
    await mount('/careers?tab=jobs');
    expect(JSON.stringify(tree.toJSON())).toContain('original-case');
    state.request.mockRejectedValue(new Error('offline'));
    await act(async () => navigate('/careers?tab=jobs&page=2'));
    await act(async () => vi.advanceTimersByTime(300));
    expect(JSON.stringify(tree.toJSON())).not.toContain('original-case');
    expect(JSON.stringify(tree.toJSON())).toContain('Could not load this scope.');
  });
  it('discards late private detail after leaving the application scope', async () => {
    await mount('/careers?tab=applications');
    let resolve!: (value: unknown) => void;
    state.request.mockImplementation((path) =>
      path.endsWith('/applications/app')
        ? new Promise((done) => {
            resolve = done;
          })
        : Promise.resolve({ data: [], total: 0, totalPages: 0 }),
    );
    await act(async () => button('Details').props.onClick());
    await act(async () => navigate('/careers?tab=jobs'));
    await act(async () => resolve({ id: 'app', coverLetter: 'PRIVATE-OLD-CASE' }));
    await act(async () => vi.advanceTimersByTime(300));
    expect(JSON.stringify(tree.toJSON())).not.toContain('PRIVATE-OLD-CASE');
  });
});

function control(label: string, type = 'select') {
  const node = tree.root.findAllByType('label').find(
    (node) =>
      node.children
        .filter((child) => typeof child === 'string')
        .join('')
        .trim() === label,
  );
  if (!node) throw new Error(`Missing label: ${label}`);
  return node.findByType(type);
}
async function change(label: string, value: string, type = 'select') {
  await act(async () => control(label, type).props.onChange({ target: { value } }));
}
const job = (id = 'one') => ({
  id,
  publicId: `career-${id}`,
  title: `Opportunity ${id}`,
  version: 7,
  description: 'A genuine opportunity',
  status: 'READY_TO_REVIEW',
  employerId: 'employer',
  opportunityType: 'JOB',
  employmentType: 'FULL_TIME',
  remoteOption: true,
  jobCategory: 'Engineering',
  countryReferenceId: 'country',
  applicationDeadline: '2030-01-02T09:30:45.000Z',
  educationRequirement: 'Degree',
  languageRequirements: ['Arabic'],
  metadata: {
    sourceUrl: 'https://employer.example/careers',
    applicationChannel: 'EXTERNAL',
    summary: 'Keep this summary',
    benefits: ['Paid leave'],
    _career: { makerActorId: 'maker' },
  },
  employer: { displayName: 'Employer', verificationStatus: 'VERIFIED' },
});
function jobsFixture() {
  state.request.mockImplementation((path, options) =>
    options?.method
      ? Promise.resolve({})
      : path.includes('?')
        ? Promise.resolve({ data: [job(), job('two')], total: 2, totalPages: 3 })
        : Promise.resolve(job(path.endsWith('/two') ? 'two' : 'one')),
  );
}
describe('Career workspace actions and navigation', () => {
  it('preserves search context from the central review queue', async () => {
    jobsFixture();
    await mount('/careers?tab=jobs&reviewSearch=career-reference');
    expect(state.request.mock.calls.at(-1)![0]).toContain('search=career-reference');
    await act(async () => button('Review').props.onClick());
    await act(async () => vi.advanceTimersByTime(300));
    const path = state.request.mock.calls.at(-1)![0];
    expect(path).toContain('search=career-reference');
    expect(path).toContain('status=READY_TO_REVIEW');
  });
  it('requests the next page while retaining the chosen opportunity filters', async () => {
    jobsFixture();
    await mount('/careers?tab=jobs&status=PUBLISHED&employerId=employer&employmentType=HYBRID');
    await act(async () => button('Next').props.onClick());
    await act(async () => vi.advanceTimersByTime(300));
    const path = state.request.mock.calls.at(-1)![0];
    expect(path).toContain('page=2');
    expect(path).toContain('status=PUBLISHED');
    expect(path).toContain('employerId=employer');
    expect(path).toContain('employmentType=HYBRID');
  });
  it('clears incompatible filters when switching sections', async () => {
    await mount('/careers?tab=jobs&status=READY_TO_PUBLISH&search=test&employerId=old');
    await act(async () => button('Employers').props.onClick());
    await act(async () => vi.advanceTimersByTime(300));
    expect(state.request.mock.calls.at(-1)![0]).toBe('/admin/careers/employers?page=1&pageSize=20');
  });
  it('requires a job scope before listing applications when all-scope access is absent', async () => {
    state.denied.add('admin:careers:applications:all');
    await mount('/careers?tab=applications');
    expect(state.request).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain('Choose an opportunity');
    await act(async () => navigate('/careers?tab=applications&jobId=permitted-job'));
    await act(async () => vi.advanceTimersByTime(300));
    expect(state.request.mock.calls.at(-1)![0]).toContain('jobId=permitted-job');
  });
  it('does not request a directly addressed section without its permission', async () => {
    state.denied.add('admin:careers:alumni:view');
    await mount('/careers?tab=alumni');
    expect(state.request).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain('You do not have permission');
  });
  it('allows decision review without requesting private applicant data when pii permission is absent', async () => {
    state.denied.add('admin:careers:applications:pii');
    await mount('/careers?tab=applications');
    await act(async () => button('Details').props.onClick());
    expect(state.request).toHaveBeenCalledTimes(1);
    expect(
      control('Choose action')
        .findAllByType('option')
        .map((node) => node.props.value),
    ).toContain('UNDER_REVIEW');
    expect(JSON.stringify(tree.toJSON())).not.toContain('Open CV securely');
  });
  it('opens applications for the selected opportunity with its canonical id', async () => {
    jobsFixture();
    await mount('/careers?tab=jobs');
    await act(async () => button('Details').props.onClick());
    await act(async () => button('Applications for this opportunity').props.onClick());
    await act(async () => vi.advanceTimersByTime(300));
    expect(state.request.mock.calls.at(-1)![0]).toBe(
      '/admin/careers/applications?page=1&pageSize=20&jobId=one',
    );
  });
  it('requires four record-specific checks and sends the selected version on approval', async () => {
    jobsFixture();
    await mount('/careers?tab=jobs');
    await act(async () => button('Details').props.onClick());
    await change('Choose action', 'mark-publishable');
    await change('Action reason *', 'Verified official details', 'textarea');
    expect(button('Confirm action').props.disabled).toBe(true);
    for (const checkbox of tree.root
      .findAllByType('input')
      .filter((node) => node.props.type === 'checkbox'))
      await act(async () => checkbox.props.onChange({ target: { checked: true } }));
    expect(button('Confirm action').props.disabled).toBe(false);
    await act(async () => button('Confirm action').props.onClick());
    const [path, options] = state.request.mock.calls.find(
      ([, options]) => options?.method === 'POST',
    )!;
    expect(path).toBe('/admin/careers/jobs/one/mark-publishable');
    expect(JSON.parse(options.body)).toEqual({
      expectedVersion: 7,
      checklist: { source: true, applicationLink: true, privacy: true, terms: true },
      reason: 'Verified official details',
    });
    expect(options.idempotencyKey).toBeTruthy();
  });
  it('does not carry review checks or reasons to another opportunity', async () => {
    jobsFixture();
    await mount('/careers?tab=jobs');
    await act(async () => button('Details').props.onClick());
    await change('Choose action', 'mark-publishable');
    await change('Action reason *', 'Old record reason', 'textarea');
    const checkbox = tree.root
      .findAllByType('input')
      .find((node) => node.props.type === 'checkbox')!;
    await act(async () => checkbox.props.onChange({ target: { checked: true } }));
    await act(async () =>
      tree.root
        .findAllByType('button')
        .filter((node) => node.children.includes('Details'))[1]
        .props.onClick(),
    );
    await change('Choose action', 'mark-publishable');
    expect(control('Action reason *', 'textarea').props.value).toBe('');
    expect(
      tree.root
        .findAllByType('input')
        .filter((node) => node.props.type === 'checkbox')
        .every((node) => !node.props.checked),
    ).toBe(true);
  });
  it('retains the same idempotency key when retrying an unchanged failed action', async () => {
    jobsFixture();
    await mount('/careers?tab=jobs');
    await act(async () => button('Details').props.onClick());
    await change('Choose action', 'archive');
    await change('Action reason *', 'Old opportunity', 'textarea');
    const handler = state.request.getMockImplementation()!;
    state.request.mockImplementation((path, options) =>
      options?.method ? Promise.reject(new Error('offline')) : handler(path, options),
    );
    await act(async () => button('Confirm action').props.onClick());
    await act(async () => button('Confirm action').props.onClick());
    const writes = state.request.mock.calls.filter(([, options]) => options?.method);
    expect(writes).toHaveLength(2);
    expect(writes[0][1].idempotencyKey).toBe(writes[1][1].idempotencyKey);
    expect(JSON.stringify(tree.toJSON())).toContain('Could not complete the action');
  });
  it('prevents duplicate writes while an action is pending', async () => {
    jobsFixture();
    await mount('/careers?tab=jobs');
    await act(async () => button('Details').props.onClick());
    await change('Choose action', 'archive');
    await change('Action reason *', 'Archive expired record', 'textarea');
    const handler = state.request.getMockImplementation()!;
    let finish!: (value: unknown) => void;
    state.request.mockImplementation((path, options) =>
      options?.method
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : handler(path, options),
    );
    const confirm = button('Confirm action').props.onClick;
    await act(async () => {
      confirm();
      confirm();
    });
    expect(state.request.mock.calls.filter(([, options]) => options?.method)).toHaveLength(1);
    await act(async () => finish({}));
  });
  it('leaves an edited record open when discarding its draft is declined', async () => {
    jobsFixture();
    await mount('/careers?tab=jobs');
    await act(async () => button('Edit').props.onClick());
    await change('Arabic opportunity title *', 'Changed title', 'input');
    vi.mocked(window.confirm).mockReturnValue(false);
    await act(async () => button('Employers').props.onClick());
    expect(control('Arabic opportunity title *', 'input').props.value).toBe('Changed title');
    expect(window.confirm).toHaveBeenCalledOnce();
  });
  it('preserves supported metadata, education and languages when saving an existing opportunity', async () => {
    jobsFixture();
    await mount('/careers?tab=jobs');
    await act(async () => button('Edit').props.onClick());
    await change('Save reason *', 'Fix opportunity title', 'textarea');
    await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    const [path, options] = state.request.mock.calls.find(
      ([, options]) => options?.method === 'PATCH',
    )!;
    const body = JSON.parse(options.body);
    expect(path).toBe('/admin/careers/jobs/one');
    expect(body.expectedVersion).toBe(7);
    expect(body.metadata.summary).toBe('Keep this summary');
    expect(body.metadata.benefits).toEqual(['Paid leave']);
    expect(body.metadata).not.toHaveProperty('_career');
    expect(body).not.toHaveProperty('employerId');
    expect(body.educationRequirement).toBe('Degree');
    expect(body.languageRequirements).toEqual(['Arabic']);
    expect(body.remoteOption).toBe(true);
    expect(body.applicationDeadline).toBe(job().applicationDeadline);
  });
  it('rejects an incomplete salary range without sending a mutation', async () => {
    jobsFixture();
    await mount('/careers?tab=jobs');
    await act(async () => button('Edit').props.onClick());
    await change('Minimum', '50000', 'input');
    await change('Save reason *', 'Review salary', 'textarea');
    await act(async () => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    expect(state.request.mock.calls.filter(([, options]) => options?.method)).toHaveLength(0);
    expect(JSON.stringify(tree.toJSON())).toContain('Check the salary range');
  });
  it('requires current public evidence before verifying the selected employer', async () => {
    const employer = {
      id: 'employer-one',
      displayName: 'Employer one',
      employerType: 'COMPANY',
      verificationStatus: 'UNVERIFIED',
      version: 4,
    };
    state.request.mockImplementation((_path, options) =>
      Promise.resolve(options?.method ? {} : { data: [employer], total: 1, totalPages: 1 }),
    );
    await mount('/careers?tab=employers');
    await act(async () => button('Details').props.onClick());
    await change('Choose action', 'verify');
    await change('Action reason *', 'Verified registration', 'textarea');
    expect(button('Confirm action').props.disabled).toBe(true);
    await change('Official verification source', 'https://employer.example/about', 'input');
    await change('Verification expiry', '2030-01-01T12:00', 'input');
    expect(button('Confirm action').props.disabled).toBe(false);
    await act(async () => button('Confirm action').props.onClick());
    const [path, options] = state.request.mock.calls.find(([, options]) => options?.method)!;
    expect(path).toBe('/admin/careers/employers/employer-one/verify');
    expect(JSON.parse(options.body)).toMatchObject({
      expectedVersion: 4,
      sourceUrl: 'https://employer.example/about',
      reason: 'Verified registration',
    });
  });
  it('sends an application decision and message only for the selected application', async () => {
    state.denied.add('admin:careers:applications:pii');
    await mount('/careers?tab=applications');
    await act(async () => button('Details').props.onClick());
    await change('Choose action', 'UNDER_REVIEW');
    await change('Action reason *', 'Begin review', 'textarea');
    await change(
      'Decision message to student — optional',
      'We are reviewing your application',
      'textarea',
    );
    await act(async () => button('Confirm action').props.onClick());
    const [path, options] = state.request.mock.calls.find(([, options]) => options?.method)!;
    expect(path).toBe('/admin/careers/applications/app/review');
    expect(JSON.parse(options.body)).toEqual({
      expectedVersion: 1,
      nextStatus: 'UNDER_REVIEW',
      studentMessage: 'We are reviewing your application',
      reason: 'Begin review',
    });
  });
  it('keeps alumni visibility read-only and does not offer consent overrides', async () => {
    state.request.mockResolvedValue({
      data: [{ id: 'alumni', visibility: 'PRIVATE', version: 2 }],
      total: 1,
      totalPages: 1,
    });
    await mount('/careers?tab=alumni');
    expect(JSON.stringify(tree.toJSON())).toContain('Private');
    expect(tree.root.findAllByType('input')).toHaveLength(0);
    expect(button('Edit')).toBeUndefined();
    expect(button('Details')).toBeUndefined();
    expect(state.request).toHaveBeenCalledOnce();
  });
});
