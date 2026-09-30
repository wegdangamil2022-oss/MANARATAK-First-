const KEY = 'manaratak_post_login_return';
const ACCOUNT_KEY = 'manaratak_active_identity';

function safeInternalPath(value: string | null | undefined): string | null {
  const path = value?.trim();
  if (!path || !path.startsWith('/') || path.startsWith('//')) return null;
  if (/^[\\/]{2}/.test(path) || path.includes('://')) return null;
  return path;
}

export function preservePostLoginReturn(path: string): void {
  const safe = safeInternalPath(path);
  if (!safe) return;
  try { sessionStorage.setItem(KEY, JSON.stringify({ path: safe, accountId: sessionStorage.getItem(ACCOUNT_KEY) })); } catch { /* storage can be unavailable */ }
}

export function consumePostLoginReturn(identityId: string): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw) as { path?: string; accountId?: string | null };
    if (pending.accountId && pending.accountId !== identityId) return null;
    return safeInternalPath(pending.path);
  } catch {
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    return null;
  }
}

export function rememberAuthenticatedIdentity(identityId: string): boolean {
  try {
    const previous = sessionStorage.getItem(ACCOUNT_KEY);
    const changed = Boolean(previous && previous !== identityId);
    if (changed) {
      sessionStorage.removeItem('manaratak_post_login_action');
      for (const key of ['manaratak_favorites_v2', 'manaratak_milestones', 'manaratak_notifications', 'manaratak_nav_state_v2']) {
        localStorage.removeItem(key);
      }
    }
    sessionStorage.setItem(ACCOUNT_KEY, identityId);
    return changed;
  } catch { return false; }
}


const ACTION_KEY = 'manaratak_post_login_action';
export type PendingPostLoginAction =
  | { kind: 'SAVE_FAVORITE'; entityType: string; entityId: string; entitySlug?: string | null }
  | { kind: 'TRACK_APPLICATION'; scholarshipId: string; scholarshipSlug?: string | null; notes?: string | null }
  | { kind: 'REQUEST_SERVICE'; serviceId: string; serviceSlug?: string | null; requestParameters?: Record<string, unknown> };

export function preservePostLoginAction(action: PendingPostLoginAction): void {
  const stableId = action.kind === 'SAVE_FAVORITE' ? action.entityId : action.kind === 'TRACK_APPLICATION' ? action.scholarshipId : action.serviceId;
  if (!stableId.trim()) return;
  try { sessionStorage.setItem(ACTION_KEY, JSON.stringify(action)); } catch { /* storage can be unavailable */ }
}

export function consumePostLoginAction(): PendingPostLoginAction | null {
  try {
    const raw = sessionStorage.getItem(ACTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingPostLoginAction> & Record<string, unknown>;
    let action: PendingPostLoginAction | null = null;
    if (parsed.kind === 'SAVE_FAVORITE' && typeof parsed.entityType === 'string' && typeof parsed.entityId === 'string') {
      action = { kind: 'SAVE_FAVORITE', entityType: parsed.entityType, entityId: parsed.entityId, entitySlug: typeof parsed.entitySlug === 'string' ? parsed.entitySlug : null };
    } else if (parsed.kind === 'TRACK_APPLICATION' && typeof parsed.scholarshipId === 'string') {
      action = { kind: 'TRACK_APPLICATION', scholarshipId: parsed.scholarshipId, scholarshipSlug: typeof parsed.scholarshipSlug === 'string' ? parsed.scholarshipSlug : null, notes: typeof parsed.notes === 'string' ? parsed.notes : null };
    } else if (parsed.kind === 'REQUEST_SERVICE' && typeof parsed.serviceId === 'string') {
      action = { kind: 'REQUEST_SERVICE', serviceId: parsed.serviceId, serviceSlug: typeof parsed.serviceSlug === 'string' ? parsed.serviceSlug : null, requestParameters: parsed.requestParameters && typeof parsed.requestParameters === 'object' ? parsed.requestParameters as Record<string, unknown> : undefined };
    }
    sessionStorage.removeItem(ACTION_KEY);
    return action;
  } catch {
    try { sessionStorage.removeItem(ACTION_KEY); } catch { /* ignore */ }
    return null;
  }
}
