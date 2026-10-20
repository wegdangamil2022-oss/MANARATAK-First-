import { performance } from 'node:perf_hooks';

const routes = new Set(['/api/v1/search/public', '/api/v1/public/scholarships']);
const finite = (n, minimum, maximum) => Number.isFinite(n) && n >= minimum && n <= maximum;
export function validateReadProbe(plan) {
  const url = new URL(plan.url);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port ||
      url.username || url.password || url.hash || !routes.has(url.pathname) ||
      !/^[a-f0-9]{40}$/.test(plan.sourceSha ?? '') ||
      !finite(plan.durationSeconds, 0.01, 120) || !finite(plan.requestsPerSecond, 0.01, 2) ||
      !Number.isSafeInteger(plan.maximumRequests) || !finite(plan.maximumRequests, 1, 240) ||
      !finite(plan.timeoutMs, 10, 2000) ||
      !finite(plan.maximumCpuPercent, 1, 90) ||
      !finite(plan.maximumResidentMemoryBytes, 1024, 1024 ** 3) ||
      !Number.isSafeInteger(plan.maximumConnections) || !finite(plan.maximumConnections, 1, 10)) {
    throw Error('R11_READ_PROBE_PLAN_INVALID');
  }
  return url;
}

export async function runBoundedReadProbe(plan, { sampleResources, signal } = {}) {
  const url = validateReadProbe(plan);
  if (typeof sampleResources !== 'function') throw Error('R11_RESOURCE_OBSERVER_REQUIRED');
  const observations = [], resources = [], started = performance.now();
  let reason = null, transferBytes = 0;
  async function resourceGuard() {
    let sample;
    try { sample = await sampleResources(); } catch { reason = 'RESOURCE_OBSERVER_UNAVAILABLE'; return false; }
    if (!sample || !finite(sample.cpuPercent, 0, 100) ||
        !finite(sample.residentMemoryBytes, 0, Number.MAX_SAFE_INTEGER) ||
        !Number.isSafeInteger(sample.activeConnections) || sample.activeConnections < 0) {
      reason = 'RESOURCE_OBSERVER_INVALID'; return false;
    }
    resources.push(sample);
    if (sample.cpuPercent > plan.maximumCpuPercent ||
        sample.residentMemoryBytes > plan.maximumResidentMemoryBytes ||
        sample.activeConnections > plan.maximumConnections) {
      reason = 'RESOURCE_BUDGET_EXCEEDED'; return false;
    }
    return true;
  }
  if (await resourceGuard()) {
    const deadline = performance.now() + plan.durationSeconds * 1000;
    while (observations.length < plan.maximumRequests && performance.now() < deadline) {
      if (signal?.aborted) { reason = 'OPERATOR_ABORT'; break; }
      const start = performance.now();
      let status = null, bytes = 0, timedOut = false;
      try {
        const timeout = AbortSignal.timeout(plan.timeoutMs);
        const response = await fetch(url, { redirect: 'error', signal: signal ? AbortSignal.any([timeout, signal]) : timeout });
        status = response.status;
        const reader = response.body.getReader();
        try {
          for (;;) {
            const { done, value } = await reader.read(); if (done) break;
            bytes += value.byteLength;
            if (bytes > 1024 ** 2) { await reader.cancel(); throw Error('RESPONSE_TOO_LARGE'); }
          }
        } finally { reader.releaseLock(); }
        if (response.headers.get('x-manaratak-source-sha') !== plan.sourceSha) reason = 'SOURCE_SHA_MISMATCH';
        else if (status !== 200) reason = status === 429 ? 'RATE_LIMIT_REACHED' : 'HTTP_ERROR';
      } catch (error) {
        timedOut = error.name === 'TimeoutError';
        reason = signal?.aborted ? 'OPERATOR_ABORT' : timedOut ? 'REQUEST_TIMEOUT' : 'REQUEST_FAILED';
      }
      transferBytes += bytes;
      observations.push({ status, latencyMs: performance.now() - start, bytes, timedOut, failed: reason !== null });
      if (reason || !(await resourceGuard())) break;
      const wait = Math.min(deadline - performance.now(), Math.max(0, 1000 / plan.requestsPerSecond - (performance.now() - start)));
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
    }
  }
  const elapsedSeconds = (performance.now() - started) / 1000;
  const sorted = observations.map(s => s.latencyMs).sort((a, b) => a - b);
  const percentile = p => sorted.length ? sorted[Math.ceil(p * sorted.length) - 1] : null;
  return {
    kind: 'R11_BOUNDED_READ_DIAGNOSTIC', sourceSha: plan.sourceSha,
    status: reason ? 'ABORTED' : 'COMPLETED_DIAGNOSTIC', abortReason: reason,
    route: url.pathname, query: url.search, elapsedSeconds, sampleCount: observations.length,
    p50Ms: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99),
    throughput: observations.length / elapsedSeconds, transferBytes,
    errorCount: observations.filter(s => s.failed).length,
    timeoutCount: observations.filter(s => s.timedOut).length,
    observations, resources, concurrency: 1, maximumRequestsPerSecond: plan.requestsPerSecond,
    productionAcceptance: false, representativeLaunchDataset: false, sloAcceptance: false,
  };
}
