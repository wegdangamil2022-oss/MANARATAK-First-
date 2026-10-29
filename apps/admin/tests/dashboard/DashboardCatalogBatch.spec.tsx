import {describe,expect,it,vi} from 'vitest';
import {dashboardSources} from '../../src/features/dashboard/DashboardSources';
import {loadDashboardSources} from '../../src/features/dashboard/DashboardLoader';
import {initialDashboardReading} from '../../src/features/dashboard/DashboardContract';

describe('Dashboard batch transport',()=>{
  const initial=()=>dashboardSources.filter(row=>['universities:total','majors:total','cms:total'].includes(row.key)).map(row=>initialDashboardReading(row,true));
  it('replaces multiple counter transports while preserving individual denial and unavailable states',async()=>{
    const request=vi.fn(async()=>({sources:{universities:{state:'available',total:12},majors:{state:'unavailable'},cms:{state:'forbidden'}}}));
    const results:any[]=[];await loadDashboardSources(initial(),request,new AbortController().signal,row=>results.push(row));
    expect(request).toHaveBeenCalledTimes(1);expect(request.mock.calls[0][0]).toContain('/admin/dashboard/catalogs?keys=');
    expect(results.find(row=>row.source.domain==='universities').metrics.total).toBe(12);
    expect(results.find(row=>row.source.domain==='cms').state).toBe('forbidden');
    expect(results.find(row=>row.source.domain==='majors').metrics.total).toBeNull();
  });
  it('discards all results when navigation aborts the batch',async()=>{
    const controller=new AbortController(),publish=vi.fn();
    await loadDashboardSources(initial(),async()=>{controller.abort();return {sources:{}};},controller.signal,publish);
    expect(publish).not.toHaveBeenCalled();
  });
  it('still times out and aborts a hung grouped transport',async()=>{
    vi.useFakeTimers();try {
      let signal:AbortSignal|undefined;const results:any[]=[];
      const pending=loadDashboardSources(initial(),async(_url,options)=>{signal=options.signal;return new Promise(()=>{});},new AbortController().signal,row=>results.push(row));
      await vi.advanceTimersByTimeAsync(30000);await pending;
      expect(signal?.aborted).toBe(true);expect(results.every(row=>row.state==='timed_out')).toBe(true);
    }finally{vi.useRealTimers();}
  });
});
