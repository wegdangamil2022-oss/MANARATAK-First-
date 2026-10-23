import {afterEach, describe, expect, it, vi} from 'vitest';
import {dashboardSources} from '../../src/features/dashboard/DashboardSources';
import {initialDashboardReading, parseDashboardResponse} from '../../src/features/dashboard/DashboardContract';
import {readDashboardSource} from '../../src/features/dashboard/DashboardLoader';
import {initialSourceState, readNextReviewPage} from '../../src/features/review-queue/ReviewLoader';
import {reviewSources} from '../../src/features/review-queue/ReviewSources';

afterEach(()=>vi.useRealTimers());
describe('Bounded owner read budgets',()=>{
 it('reads absent import status groups as zero only when the histogram accounts for the total',()=>{
  const source=dashboardSources.find(source=>source.key==='imports')!;
  const empty=parseDashboardResponse(source,{totalBatches:0,totalRecords:0,recordStatusCounts:{}});
  expect(empty.state).toBe('available');expect(empty.metrics.NEEDS_REVIEW).toBe(0);
  const promoted=parseDashboardResponse(source,{totalBatches:1,totalRecords:4,recordStatusCounts:{PROMOTED:4}});
  expect(promoted.metrics.NEEDS_REVIEW).toBe(0);expect(promoted.metrics.PROMOTED).toBe(4);
  for(const recordStatusCounts of [undefined,{}, {PROMOTED:3},{PROMOTED:null}]){
   const incomplete=parseDashboardResponse(source,{totalBatches:1,totalRecords:4,recordStatusCounts});
   expect(incomplete.metrics.NEEDS_REVIEW).toBeNull();expect(incomplete.state).toBe('partial');
  }
 });
 it('accepts valid slow responses beyond the former 5/8 second deadlines',async()=>{
  vi.useFakeTimers();
  const source=dashboardSources.find(source=>source.key==='majors:total')!;
  const dashboard=readDashboardSource(initialDashboardReading(source,true),()=>new Promise(resolve=>setTimeout(()=>resolve({total:3}),10000)),new AbortController().signal);
  const review=readNextReviewPage(initialSourceState(reviewSources[0],true),()=>new Promise(resolve=>setTimeout(()=>resolve({data:[],total:0,page:1,pageSize:50}),10000)),new AbortController().signal);
  await vi.advanceTimersByTimeAsync(10000);
  expect((await dashboard).metrics.total).toBe(3);
  expect((await dashboard).state).toBe('available');
  expect((await review).availability).toBe('ready');
 });
 it('still terminates a hung source and cancels its transport',async()=>{
  vi.useFakeTimers();let transport:AbortSignal|undefined;
  const source=dashboardSources.find(source=>source.key==='majors:total')!;
  const read=readDashboardSource(initialDashboardReading(source,true),(_url,options)=>{transport=options.signal;return new Promise(()=>{});},new AbortController().signal);
  await vi.advanceTimersByTimeAsync(30000);
  const result=await read;
  expect(result.state).toBe('timed_out');expect(result.metrics.total).toBeNull();expect(transport?.aborted).toBe(true);
 });
});
