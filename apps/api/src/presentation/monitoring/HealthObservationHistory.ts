import type { HealthStatus } from '@manaratak/core';
type Sample = { checkedAt: string; components: Array<{ id: string; status: HealthStatus }> };
/** Actual diagnostic observations, never a claim of continuous monitoring. No payload/PII. */
export class HealthObservationHistory {
  private readonly startedAt = new Date().toISOString();
  private samples: Sample[] = [];
  record(sample: Sample): void {
    const capturedAt = Date.parse(sample.checkedAt);
    if (!Number.isFinite(capturedAt) || capturedAt > Date.now() + 1000 ||
      capturedAt < Date.now() - 7 * 86_400_000 || !Array.isArray(sample.components) || sample.components.length > 100 ||
      sample.components.some(c => !c || !/^[a-z][a-z0-9-]{0,79}$/.test(c.id) || !['UP','DOWN','UNKNOWN','DEGRADED'].includes(c.status)) ||
      new Set(sample.components.map(c => c.id)).size !== sample.components.length)
      throw new Error('HEALTH_HISTORY_SAMPLE_INVALID');
    if (
      this.samples.length &&
      Date.parse(sample.checkedAt) - Date.parse(this.samples.at(-1)!.checkedAt) < 30_000
    )
      return;
    this.samples.push({
      checkedAt: new Date(capturedAt).toISOString(),
      components: sample.components.map(({ id, status }) => ({ id, status })),
    });
    const cutoff = Date.now() - 7 * 86_400_000;
    this.samples = this.samples
      .filter((item) => Date.parse(item.checkedAt) >= cutoff)
      .slice(-10_000);
  }
  read(window: '1h' | '24h' | '7d', cursor?: string) {
    const duration = window === '1h' ? 3_600_000 : window === '24h' ? 86_400_000 : 7 * 86_400_000;
    const since = Date.now() - duration;
    const all = this.samples
      .filter((item) => Date.parse(item.checkedAt) >= since)
      .slice()
      .reverse();
    const remaining = cursor ? all.filter((item) => item.checkedAt < cursor) : all;
    const samples = remaining.slice(0, 100);
    return {
      availability: samples.length ? 'PARTIAL_OBSERVATIONS' : 'UNAVAILABLE',
      scope: 'PROCESS_LOCAL_SESSION',
      continuousCoverage: false,
      startedAt: this.startedAt,
      window,
      total: all.length,
      nextCursor: remaining.length > 100 ? samples.at(-1)!.checkedAt : null,
      retentionDays: 7,
      samplingMinimumMs: 30_000,
      maximumSamples: 10_000,
      samples: structuredClone(samples),
    };
  }
}
