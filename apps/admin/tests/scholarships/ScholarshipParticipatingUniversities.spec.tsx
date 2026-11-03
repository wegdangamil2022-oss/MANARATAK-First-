import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScholarshipDto } from '@manaratak/domain';
import type { CanonicalPickerOption } from '../../src/api/canonicalPickers';
const api = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/api/client', () => ({ adminApiClient: api }));
vi.mock('../../src/components/AdminLink', () => ({
  AdminLink: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock('../../src/components/CanonicalPicker', () => ({
  CanonicalPicker: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value?: string;
    onChange: (id: string | null, option: CanonicalPickerOption) => void;
  }) => (
    <input
      aria-label={label}
      value={value ?? ''}
      onChange={(event) =>
        onChange(event.target.value, {
          id: event.target.value,
          label: `Canonical ${event.target.value}`,
          lifecycle: event.target.value === 'inactive' ? 'ARCHIVED' : 'ACTIVE',
        })
      }
    />
  ),
}));
import {
  ScholarshipParticipatingUniversitiesEditor,
  ScholarshipUniversityCards,
} from '../../src/features/scholarships/ScholarshipParticipatingUniversities';
const original = {
  id: 's1',
  revision: 7,
  status: 'IMPORTED',
  publicationStatus: 'DRAFT',
  universityLinks: [
    {
      linkKey: 'existing-program',
      universityId: 'u1',
      academicProgramId: 'p1',
      relationshipTypeCode: 'TARGET_PROGRAM',
      sourceLabel: 'Old source name',
      metadata: { proof: 'keep' },
      university: { id: 'u1', displayName: 'Directory university', status: 'PUBLISHED' },
    },
  ],
} as unknown as ScholarshipDto;
let tree: ReactTestRenderer;
beforeEach(() => api.request.mockReset());
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
const button = (label: string) =>
  tree.root.findAllByType('button').find((node) => node.children.includes(label))!;
async function select(id: string) {
  await act(async () =>
    tree.root
      .findByProps({ 'aria-label': 'Participating university' })
      .props.onChange({ target: { value: id } }),
  );
}
async function renderEditor(scholarship = original, onSaved = vi.fn(), disabled = false) {
  await act(async () => {
    tree = create(
      <ScholarshipParticipatingUniversitiesEditor
        scholarship={scholarship}
        language="en"
        disabled={disabled}
        onDirtyChange={vi.fn()}
        onSaved={onSaved}
      />,
    );
  });
}
describe('Participating universities', () => {
  it('shows one box per university using the current owner name, while preserving program relationships', async () => {
    const onRemove = vi.fn();
    await act(async () => {
      tree = create(
        <ScholarshipUniversityCards
          links={[
            ...original.universityLinks!,
            {
              linkKey: 'participant',
              universityId: 'u1',
              university: original.universityLinks![0].university,
            },
          ]}
          language="en"
          onRemove={onRemove}
        />,
      );
    });
    expect(tree.root.findAllByType('article')).toHaveLength(1);
    expect(tree.root.findByType('strong').children.join('')).toBe('Directory university');
    expect(tree.root.findByType('a').props.href).toBe('/universities/u1');
    await act(async () => button('Remove link').props.onClick());
    expect(onRemove).toHaveBeenCalledWith(['participant']);
    expect(original.universityLinks![0].academicProgramId).toBe('p1');
  });
  it('reads names from the joined owner rather than the imported source label', async () => {
    await act(async () => {
      tree = create(<ScholarshipUniversityCards links={original.universityLinks!} language="en" />);
    });
    const renamed = [
      {
        ...original.universityLinks![0],
        university: { id: 'u1', displayName: 'Renamed directory university', status: 'PUBLISHED' },
      },
    ];
    await act(async () =>
      tree.update(<ScholarshipUniversityCards links={renamed} language="en" />),
    );
    expect(tree.root.findByType('strong').children.join('')).toBe('Renamed directory university');
    expect(JSON.stringify(tree.toJSON())).not.toContain('Old source name');
  });
  it('sends only university links through the existing owner API with revision and review reason', async () => {
    const onSaved = vi.fn();
    api.request.mockResolvedValue({ ...original, revision: 8 });
    await renderEditor(original, onSaved);
    await select('u2');
    await act(async () => button('Add university').props.onClick());
    expect(tree.root.findAllByType('article')).toHaveLength(2);
    await act(async () =>
      tree.root
        .findByProps({ 'aria-label': 'Participating universities change reason' })
        .props.onChange({ target: { value: 'Official participating list' } }),
    );
    await act(async () => button('Save participating universities').props.onClick());
    const [url, options] = api.request.mock.calls[0];
    expect(url).toBe('/admin/scholarships/s1/canonical-relationships');
    expect(options.headers).toEqual({
      'If-Match': '7',
      'X-Review-Reason': 'Official participating list',
    });
    const body = JSON.parse(options.body);
    expect(Object.keys(body)).toEqual(['universityLinks']);
    expect(body.universityLinks[0]).toEqual({
      linkKey: 'existing-program',
      universityId: 'u1',
      academicProgramId: 'p1',
      relationshipTypeCode: 'TARGET_PROGRAM',
      sourceLabel: 'Old source name',
      metadata: { proof: 'keep' },
    });
    expect(body.universityLinks[1]).toMatchObject({
      universityId: 'u2',
      relationshipTypeCode: 'PARTICIPATING',
    });
    expect(body.universityLinks[1]).not.toHaveProperty('university');
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 's1', revision: 8 }));
  });
  it('prevents duplicate or inactive additions, including direct invocation of a disabled button', async () => {
    await renderEditor();
    await select('u1');
    expect(button('Add university').props.disabled).toBe(true);
    await act(async () => button('Add university').props.onClick());
    await select('inactive');
    expect(button('Add university').props.disabled).toBe(true);
    await act(async () => button('Add university').props.onClick());
    expect(tree.root.findAllByType('article')).toHaveLength(1);
    expect(api.request).not.toHaveBeenCalled();
  });
  it.each(['different-owner', 'same-revision'])(
    'rejects an invalid save receipt: %s',
    async (invalid) => {
      const onSaved = vi.fn();
      api.request.mockResolvedValue({
        ...original,
        id: invalid === 'different-owner' ? 'other' : 's1',
        revision: invalid === 'same-revision' ? 7 : 8,
      });
      await renderEditor(original, onSaved);
      await select('u2');
      await act(async () => button('Add university').props.onClick());
      await act(async () =>
        tree.root
          .findByProps({ 'aria-label': 'Participating universities change reason' })
          .props.onChange({ target: { value: 'Official list' } }),
      );
      await act(async () => button('Save participating universities').props.onClick());
      expect(onSaved).not.toHaveBeenCalled();
      expect(tree.root.findByProps({ role: 'alert' }).children.join('')).toBe(
        'SCHOLARSHIP_READBACK_TARGET_MISMATCH',
      );
    },
  );
  it('keeps published scholarships and revoked permissions read only', async () => {
    await renderEditor({ ...original, publicationStatus: 'PUBLISHED' });
    expect(tree.root.findByType('fieldset').props.disabled).toBe(true);
    await select('u2');
    await act(async () => button('Add university').props.onClick());
    expect(tree.root.findAllByType('article')).toHaveLength(1);
    expect(api.request).not.toHaveBeenCalled();
    await renderEditor(original, vi.fn(), true);
    expect(button('Save participating universities').props.disabled).toBe(true);
  });
});
