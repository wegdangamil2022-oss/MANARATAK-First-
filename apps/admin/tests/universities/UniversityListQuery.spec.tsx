import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { readUniversityListQuery, useUniversityListQuery } from '../../src/features/universities/useUniversityListQuery';
let tree: ReturnType<typeof create>;
let query: ReturnType<typeof useUniversityListQuery>;
let navigate: ReturnType<typeof useNavigate>;
let location: ReturnType<typeof useLocation>;
function Probe() { query = useUniversityListQuery(); navigate = useNavigate(); location = useLocation(); return null; }
afterEach(async () => { if (tree) await act(async () => tree.unmount()); });
describe('University list scope', () => {
  it('restores filters, location, pagination and router history without losing state', async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    await act(async () => { tree = create(<MemoryRouter initialEntries={[{ pathname: '/universities', search: '?query=Medicine&status=PUBLISHED&completenessStatus=COMPLETE&page=3&countryReferenceId=c&regionReferenceId=r&cityReferenceId=t&institutionType=COLLEGE&sort=NAME_ASC', state: { retained: true } }]}><Probe /></MemoryRouter>); });
    expect(query).toMatchObject({ searchTerm: 'Medicine', statusFilter: 'PUBLISHED', completenessFilter: 'COMPLETE', page: 3, countryReferenceId: 'c' });
    expect(query.params.get('cityReferenceId')).toBe('t');
    await act(async () => query.setStatusFilter('ARCHIVED'));
    expect(query.page).toBe(1);
    await act(async () => navigate('/universities?search=Engineering&page=2'));
    expect(query.searchTerm).toBe('Engineering');
    await act(async () => navigate(-1));
    expect(query.searchTerm).toBe('Medicine');
    expect(query.statusFilter).toBe('ARCHIVED');
    expect(location.key).toBeTruthy();
  });
  it('bounds search and excludes invalid filters and pages', () => {
    const query = readUniversityListQuery('search='+'x'.repeat(250)+'&status=bad&institutionType=bad&completenessStatus=bad&sort=bad&page=Infinity');
    expect(query.params.get('search')).toHaveLength(200);
    expect(query.params.has('status')).toBe(false);
    expect(query.params.has('institutionType')).toBe(false);
    expect(query.page).toBe(1);
  });
});
