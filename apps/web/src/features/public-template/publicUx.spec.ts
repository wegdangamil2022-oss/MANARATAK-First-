import {describe, expect, it, vi, afterEach} from 'vitest';
import {initialNavigation, routeKey} from './usePublicNavigation';
import {readStoredArray, writeStored} from './storage';
import {GOLDEN_ARTICLES} from './data/articleData';
import {INITIAL_SCHOLARSHIPS} from './data/mockData';

afterEach(() => vi.unstubAllGlobals());
describe('Public UI navigation contract', () => {
  it('distinguishes a directory from its course tracks', () => {
    const route={...initialNavigation, activeTab:'search' as const, selectedCategory:'courses' as const};
    expect(new Set([routeKey(route),routeKey({...route,selectedCourseTrack:'native'}),routeKey({...route,selectedCourseTrack:'paid'}),routeKey({...route,selectedCourseTrack:'imported'})]).size).toBe(4);
  });
  it('does not create a navigation entry for every search keystroke', () => {
    expect(routeKey({...initialNavigation,globalSearchQuery:'الصين'})).toBe(routeKey(initialNavigation));
  });
  it('distinguishes entity, smart search, information and nested detail views', () => {
    const keys=[initialNavigation,{...initialNavigation,selectedScholarship:INITIAL_SCHOLARSHIPS[0]}, {...initialNavigation,isSmartSearchOpen:true}, {...initialNavigation,auxiliaryPage:'faq' as const}, {...initialNavigation,nestedDetailId:'china'}].map(routeKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('keeps the previous public view unchanged when creating a new one', () => {
    const snapshot=JSON.stringify(initialNavigation);
    routeKey({...initialNavigation,selectedScholarship:INITIAL_SCHOLARSHIPS[0]});
    expect(JSON.stringify(initialNavigation)).toBe(snapshot);
  });
  it('the published article source exposes Arabic titles', () => {
    expect(GOLDEN_ARTICLES.length).toBeGreaterThan(0);
    expect(GOLDEN_ARTICLES.every(article=>article.titleAr.trim().length>0)).toBe(true);
  });
});
describe('safe preview persistence', () => {
  const fallback=[{id:'fallback'}];
  it.each(['broken JSON','{}','[null]','[{"id":5}]'])('rejects malformed array data: %s', value => {
    vi.stubGlobal('window',{localStorage:{getItem:()=>value}});
    expect(readStoredArray('test',fallback)).toEqual(fallback);
  });
  it('retains valid saved records', () => {
    vi.stubGlobal('window',{localStorage:{getItem:()=>'[{"id":"saved"}]'}});
    expect(readStoredArray('test',fallback)).toEqual([{id:'saved'}]);
  });
  it('continues in memory if storage is blocked', () => {
    vi.stubGlobal('window',{localStorage:{getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('blocked');}}});
    expect(readStoredArray('test',fallback)).toEqual(fallback);
    expect(()=>writeStored('test','value')).not.toThrow();
  });
});

