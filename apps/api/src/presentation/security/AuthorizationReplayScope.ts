import { AsyncLocalStorage } from 'node:async_hooks';
import type { Request } from 'express';
import type { AuthorizationEvaluatorService } from '@manaratak/domain';

type Attributes = Record<string, string | number | boolean | null>;
type Check = { permission: string; attributes: Attributes };
export type AuthorizationReplayProof = {
  principalId: string;
  checks: Check[];
  replayable: boolean;
};
const scopes = new AsyncLocalStorage<AuthorizationReplayProof>();
const transient = new Set(['ip', 'requestTime', 'userAgent', 'correlationId']);

export function createAuthorizationReplayScope(principalId: string): AuthorizationReplayProof {
  return { principalId, checks: [], replayable: true };
}

export function runInAuthorizationReplayScope<T>(
  proof: AuthorizationReplayProof,
  next: () => T,
): T {
  return scopes.run(proof, next);
}

function record(
  identityId: string,
  permission: string,
  context: Record<string, unknown>,
  granted: boolean,
) {
  const scope = scopes.getStore();
  if (!scope || scope.principalId !== identityId || !granted) return;
  const attributes: Attributes = {};
  for (const [key, value] of Object.entries(context)) {
    if (transient.has(key) || value === undefined) continue;
    if (
      value === null ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value)) ||
      (typeof value === 'string' && value.length <= 1000)
    )
      attributes[key] = value;
    else scope.replayable = false;
  }
  if (scope.checks.length >= 128) scope.replayable = false;
  else if (
    !scope.checks.some(
      (check) =>
        check.permission === permission &&
        JSON.stringify(check.attributes) === JSON.stringify(attributes),
    )
  )
    scope.checks.push({ permission, attributes });
}

/** Decorate the API's singleton without changing domain authorization or sharing
 * mutable request state. All fresh checks, including nested owner checks, count. */
export function captureAuthorizationEvaluator(
  service: AuthorizationEvaluatorService,
): AuthorizationEvaluatorService {
  return new Proxy(service, {
    get(target, property) {
      if (property === 'evaluatePermission')
        return async (...args: Parameters<typeof service.evaluatePermission>) => {
          const result = await target.evaluatePermission(...args);
          record(args[0], args[1], args[2] ?? {}, result.isGranted);
          return result;
        };
      if (property === 'evaluateAccess')
        return async (...args: Parameters<typeof service.evaluateAccess>) => {
          const result = await target.evaluateAccess(...args);
          record(args[0], `${args[1].value}:${args[2].value}`, args[3] ?? {}, result.isGranted);
          return result;
        };
      if (property === 'evaluatePermissions')
        return async (...args: Parameters<typeof service.evaluatePermissions>) => {
          const results = await target.evaluatePermissions(...args);
          results.forEach((result, index) =>
            record(args[0], args[1][index], args[2] ?? {}, result.isGranted),
          );
          return results;
        };
      const value = Reflect.get(target, property);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export async function authorizeStoredReplay(
  value: unknown,
  req: Request,
  evaluator: AuthorizationEvaluatorService,
): Promise<boolean> {
  if (!value || typeof value !== 'object') return false;
  const proof = value as AuthorizationReplayProof;
  if (
    proof.principalId !== req.authUserId ||
    proof.replayable !== true ||
    !Array.isArray(proof.checks) ||
    !proof.checks.length ||
    proof.checks.length > 128
  )
    return false;
  for (const check of proof.checks) {
    if (
      !check ||
      typeof check.permission !== 'string' ||
      !check.attributes ||
      typeof check.attributes !== 'object' ||
      Array.isArray(check.attributes)
    )
      return false;
    const result = await evaluator.evaluatePermission(req.authUserId!, check.permission, {
      ...check.attributes,
      ip: req.ip || req.socket?.remoteAddress || undefined,
      requestTime: new Date(),
      userAgent: req.get('user-agent'),
      correlationId: req.get('x-correlation-id'),
    });
    if (!result.isGranted) return false;
  }
  return true;
}
