// Shared by synthetic browser contexts on one loopback IP. Never changes server limits.
export function createDiagnosticRequestBudget({ maximumRequests = 60, windowMilliseconds = 61000, now = Date.now, sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)) } = {}) {
  if (!Number.isSafeInteger(maximumRequests) || maximumRequests < 1 || maximumRequests > 60
    || !Number.isSafeInteger(windowMilliseconds) || windowMilliseconds < 61000) throw Error('DIAGNOSTIC_REQUEST_BUDGET_INVALID');
  const reservations = [];
  let count = 0, delayed = 0, maximumDelayMilliseconds = 0;
  return {
    async acquire() {
      const current = now();
      const slot = Math.max(current, reservations.length === maximumRequests ? reservations.shift() + windowMilliseconds : current);
      // Reserve before awaiting, so concurrent routes cannot claim the same budget.
      reservations.push(slot); count++;
      const delay = Math.max(0, slot - current);
      if (delay) { delayed++; maximumDelayMilliseconds = Math.max(maximumDelayMilliseconds, delay); await sleep(delay); }
    },
    snapshot: () => ({ maximumRequests, windowMilliseconds, count, delayed, maximumDelayMilliseconds, serverLimitsChanged: false, rejectedRequestsRetried: false }),
  };
}
