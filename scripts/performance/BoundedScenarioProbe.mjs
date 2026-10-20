import { performance } from 'node:perf_hooks';

const categories = new Set(['student-writes', 'admin-scans', 'imports', 'finance-stub', 'worker-queues']);
export async function runBoundedScenario(plan, { step, sampleResources }) {
  if (!categories.has(plan.category) || !/^[a-f0-9]{40}$/.test(plan.sourceSha ?? '') ||
      !Number.isSafeInteger(plan.maximumOperations) || plan.maximumOperations < 1 || plan.maximumOperations > 30 ||
      !Number.isFinite(plan.durationSeconds) || plan.durationSeconds <= 0 || plan.durationSeconds > 60 ||
      !Number.isFinite(plan.operationsPerSecond) || plan.operationsPerSecond <= 0 || plan.operationsPerSecond > 0.5 ||
      !Number.isFinite(plan.operationTimeoutMs) || plan.operationTimeoutMs < 10 || plan.operationTimeoutMs > 2000 ||
      !Number.isFinite(plan.maximumCpuPercent) || plan.maximumCpuPercent <= 0 || plan.maximumCpuPercent > 90 ||
      !Number.isSafeInteger(plan.maximumResidentMemoryBytes) || plan.maximumResidentMemoryBytes < 1024 || plan.maximumResidentMemoryBytes > 1024 ** 3 ||
      !Number.isSafeInteger(plan.maximumConnections) || plan.maximumConnections < 1 || plan.maximumConnections > 10 ||
      typeof step !== 'function' || typeof sampleResources !== 'function') throw Error('R11_SCENARIO_PLAN_INVALID');
  const started = performance.now(), observations = [], resources = [];
  const deadline = started + plan.durationSeconds * 1000;
  let abortReason = null;
  while (observations.length < plan.maximumOperations && performance.now() < deadline) {
    const cycleStarted = performance.now();
    let resource;
    try { resource = await sampleResources(); } catch { abortReason = 'RESOURCE_OBSERVER_UNAVAILABLE'; break; }
    if (!resource || !Number.isFinite(resource.cpuPercent) || resource.cpuPercent < 0 || resource.cpuPercent > 100 ||
        !Number.isFinite(resource.residentMemoryBytes) || resource.residentMemoryBytes < 0 ||
        !Number.isSafeInteger(resource.activeConnections) || resource.activeConnections < 0) {
      abortReason = 'RESOURCE_OBSERVER_INVALID'; break;
    }
    resources.push(resource);
    if (resource.cpuPercent > plan.maximumCpuPercent || resource.residentMemoryBytes > plan.maximumResidentMemoryBytes ||
        resource.activeConnections > plan.maximumConnections) { abortReason = 'RESOURCE_BUDGET_EXCEEDED'; break; }
    const at = performance.now(), signal = AbortSignal.timeout(plan.operationTimeoutMs);
    try {
      // Await settlement: a timed-out mutation must not continue in the background while a new one starts.
      const observation = await step({ index: observations.length, signal });
      if (signal.aborted) { abortReason = 'OPERATION_TIMEOUT'; break; }
      if (observation?.verified !== true) { abortReason = 'INVARIANT_UNVERIFIED'; break; }
      observations.push({ latencyMs: performance.now() - at, ...observation });
    } catch { abortReason = signal.aborted ? 'OPERATION_TIMEOUT' : 'SCENARIO_STEP_FAILED'; break; }
    const wait = Math.min(deadline - performance.now(), Math.max(0, 1000 / plan.operationsPerSecond - (performance.now() - cycleStarted)));
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
  }
  const elapsedSeconds = (performance.now() - started) / 1000;
  const latencies = observations.map(o => o.latencyMs).sort((a, b) => a - b);
  const percentile = p => latencies.length ? latencies[Math.ceil(p * latencies.length) - 1] : null;
  return { kind: 'R11_BOUNDED_SCENARIO_DIAGNOSTIC', category: plan.category, sourceSha: plan.sourceSha,
    status: abortReason ? 'ABORTED' : 'COMPLETED_DIAGNOSTIC', abortReason,
    sampleCount: observations.length, elapsedSeconds, throughput: observations.length / elapsedSeconds,
    p50Ms: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99), observations, resources,
    concurrency: 1, externalProvidersAllowed: false, representativeLaunchDataset: false,
    sloAcceptance: false, productionAcceptance: false };
}
