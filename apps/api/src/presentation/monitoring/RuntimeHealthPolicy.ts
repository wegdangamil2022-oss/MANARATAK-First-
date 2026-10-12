export function successfulPublicWebStatus(status: number): boolean {
  return status === 200 || status === 204;
}
export function freshWorkerEvidence(
  snapshot: {
    state?: string;
    lastSuccessAt?: string;
    lastPollAt?: string;
    observedAt?: string;
    lastErrorAt?: string;
  },
  maxAgeMs: number,
  now = Date.now(),
): boolean {
  if (!['RUNNING', 'IDLE'].includes(snapshot.state ?? '')) return false;
  const timestamp = snapshot.observedAt ?? snapshot.lastSuccessAt ?? snapshot.lastPollAt;
  const at = Date.parse(timestamp ?? '');
  const errorAt = Date.parse(snapshot.lastErrorAt ?? '');
  return (
    Number.isFinite(at) &&
    at <= now + 1_000 &&
    now - at <= maxAgeMs &&
    (!Number.isFinite(errorAt) || errorAt < at)
  );
}
