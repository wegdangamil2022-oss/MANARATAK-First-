import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import {
  readDestinationListQuery,
  useDestinationListQuery,
} from '../../src/features/destinations/useDestinationListQuery';
import { jsonEqual } from '../../src/utils/jsonEqual';
let tree: ReturnType<typeof create>,
  query: ReturnType<typeof useDestinationListQuery>,
  navigate: ReturnType<typeof useNavigate>;
function Probe() {
  query = useDestinationListQuery();
  navigate = useNavigate();
  return null;
}
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
describe('Destination list links and readback comparisons', () => {
  it('restores filters and browser history and resets pagination when filters change', async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    await act(async () => {
      tree = create(
        <MemoryRouter
          initialEntries={[
            '/study-destinations?q=Yemen&region=Asia&status=PUBLISHED&completenessStatus=COMPLETE&page=3',
          ]}
        >
          <Probe />
        </MemoryRouter>,
      );
    });
    expect(query).toMatchObject({
      query: 'Yemen',
      region: 'Asia',
      status: 'PUBLISHED',
      completeness: 'COMPLETE',
      page: 3,
    });
    await act(async () => {
      query.setStatus('DRAFT');
      query.setPage(1);
    });
    expect(query.page).toBe(1);
    expect(query.status).toBe('DRAFT');
    await act(async () => navigate('/study-destinations?q=Jordan&page=2'));
    expect(query.query).toBe('Jordan');
    await act(async () => navigate(-1));
    expect(query.query).toBe('Yemen');
    expect(query.status).toBe('DRAFT');
  });
  it('rejects invalid enum, readiness and page values and bounds searches', () => {
    const query = readDestinationListQuery(
      'q=' + 'x'.repeat(250) + '&status=bad&missingCheck=bad&region=bad&page=Infinity',
    );
    expect(query.page).toBe(1);
    expect(query.params.get('q')).toHaveLength(200);
    expect(query.params.has('status')).toBe(false);
    expect(query.params.has('missingCheck')).toBe(false);
    expect(query.params.has('region')).toBe(false);
  });
  it('compares JSON objects independently of PostgreSQL key order while preserving array order and false or zero', () => {
    expect(
      jsonEqual([{ a: 0, b: false, c: { x: 1, y: 2 } }], [{ c: { y: 2, x: 1 }, b: false, a: 0 }]),
    ).toBe(true);
    expect(jsonEqual([1, 2], [2, 1])).toBe(false);
    expect(jsonEqual({ value: 0 }, { value: null })).toBe(false);
  });
});
