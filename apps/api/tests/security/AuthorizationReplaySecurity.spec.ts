import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createCanonicalIdempotencyMiddleware } from '../../src/presentation/middleware/CanonicalIdempotencyMiddleware';
import {
  captureAuthorizationEvaluator,
  createAuthorizationReplayScope,
  runInAuthorizationReplayScope,
} from '../../src/presentation/security/AuthorizationReplayScope';

function fixture() {
  let allowed = true,
    contextAllowed = true,
    body: unknown;
  let complete = false;
  const current = vi.fn(
    async (_actor: string, permission: string, context: Record<string, unknown>) => ({
      isGranted:
        allowed &&
        (permission !== 'admin:synthetic:publish' || contextAllowed) &&
        context.courseId === 'course-1',
    }),
  );
  const evaluator = captureAuthorizationEvaluator({ evaluatePermission: current } as never);
  const store = {
    begin: vi.fn(async () =>
      complete
        ? { kind: 'REPLAY', statusCode: 200, responseBody: body }
        : { kind: 'STARTED', scopeHash: 'scope', leaseToken: 'lease' },
    ),
    complete: vi.fn(async (input: { responseBody: unknown }) => {
      body = structuredClone(input.responseBody);
      complete = true;
    }),
  };
  const mutation = vi.fn();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.authUserId = req.get('x-test-actor') ?? 'actor-1';
    next();
  });
  app.use(
    createCanonicalIdempotencyMiddleware({
      store: store as never,
      requireKey: true,
      replayAuthorization: evaluator,
    }),
  );
  app.post('/command', async (req, res, next) => {
    try {
      for (const permission of ['admin:synthetic:edit', 'admin:synthetic:publish']) {
        const check = await evaluator.evaluatePermission(req.authUserId!, permission, {
          courseId: 'course-1',
          requestTime: new Date(),
          ip: req.ip,
        });
        if (!check.isGranted) return void res.status(403).json({ error: 'DENIED' });
      }
      mutation();
      res.json({ private: 'synthetic-receipt' });
    } catch (error) {
      next(error);
    }
  });
  const send = () =>
    request(app).post('/command').set('Idempotency-Key', 'same-command-key').send({ value: 1 });
  return {
    app,
    send,
    current,
    store,
    mutation,
    revoke: () => {
      allowed = false;
    },
    expirePolicy: () => {
      contextAllowed = false;
    },
    setLegacy: () => {
      body = { private: 'legacy-secret' };
      complete = true;
    },
  };
}

describe('A transport replay is subject to current action authorization', () => {
  it('isolates simultaneous actors across async permission checks', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const evaluator = captureAuthorizationEvaluator({
      evaluatePermission: async () => {
        await gate;
        return { isGranted: true };
      },
    } as never);
    const first = createAuthorizationReplayScope('actor-1');
    const second = createAuthorizationReplayScope('actor-2');
    const pending = [first, second].map((proof, index) =>
      runInAuthorizationReplayScope(proof, async () => {
        await evaluator.evaluatePermission(proof.principalId, `admin:synthetic:action-${index}`, {
          resourceId: `resource-${index}`,
        });
      }),
    );
    release();
    await Promise.all(pending);
    expect(first.checks).toEqual([
      { permission: 'admin:synthetic:action-0', attributes: { resourceId: 'resource-0' } },
    ]);
    expect(second.checks).toEqual([
      { permission: 'admin:synthetic:action-1', attributes: { resourceId: 'resource-1' } },
    ]);
  });
  it('captures batch and resource checks and fails closed for unsupported policy context', async () => {
    const evaluator = captureAuthorizationEvaluator({
      evaluatePermissions: async () => [{ isGranted: true }, { isGranted: false }],
      evaluateAccess: async () => ({ isGranted: true }),
      evaluatePermission: async () => ({ isGranted: true }),
    } as never);
    const proof = createAuthorizationReplayScope('actor-1');
    await runInAuthorizationReplayScope(proof, async () => {
      await evaluator.evaluatePermissions(
        'actor-1',
        ['admin:synthetic:view', 'admin:synthetic:publish'],
        { courseId: 'course-1' },
      );
      await evaluator.evaluateAccess(
        'actor-1',
        { value: 'admin:synthetic' } as never,
        { value: 'edit' } as never,
        { courseId: 'course-1' },
      );
      await evaluator.evaluatePermission('other-actor', 'admin:synthetic:ignored');
      await evaluator.evaluatePermission('actor-1', 'admin:synthetic:scoped', {
        nested: { country: 'YE' },
      });
    });
    expect(proof.checks.map((check) => check.permission)).toEqual([
      'admin:synthetic:view',
      'admin:synthetic:edit',
      'admin:synthetic:scoped',
    ]);
    expect(proof.replayable).toBe(false);
  });
  it('rechecks every granted action and resource context without executing the mutation twice', async () => {
    const f = fixture();
    await f.send().expect(200);
    f.current.mockClear();
    const replay = await f.send().expect(200);
    expect(replay.body).toEqual({ private: 'synthetic-receipt' });
    expect(replay.headers['idempotency-replayed']).toBe('true');
    expect(f.current.mock.calls.map((call) => call[1])).toEqual([
      'admin:synthetic:edit',
      'admin:synthetic:publish',
    ]);
    expect(
      f.current.mock.calls.every(
        (call) => call[2].courseId === 'course-1' && call[2].requestTime instanceof Date,
      ),
    ).toBe(true);
    expect(f.mutation).toHaveBeenCalledTimes(1);
    expect(f.store.complete.mock.calls[0][0].responseBody).toMatchObject({
      kind: 'AUTHORIZED_ADMIN_RESPONSE_V1',
    });
  });
  it.each(['role revocation', 'policy expiry'])('withholds the receipt after %s', async (kind) => {
    const f = fixture();
    await f.send().expect(200);
    if (kind === 'role revocation') f.revoke();
    else f.expirePolicy();
    const replay = await f.send().expect(403);
    expect(replay.body.error).toBe('IDEMPOTENCY_REPLAY_PERMISSION_DENIED');
    expect(JSON.stringify(replay.body)).not.toContain('synthetic-receipt');
    expect(f.mutation).toHaveBeenCalledTimes(1);
  });
  it('fails closed for historical responses lacking an authorization proof', async () => {
    const f = fixture();
    f.setLegacy();
    const replay = await f.send().expect(403);
    expect(JSON.stringify(replay.body)).not.toContain('legacy-secret');
    expect(f.mutation).not.toHaveBeenCalled();
  });
  it('does not accept another actor even if a store returns the wrong receipt', async () => {
    const f = fixture();
    await f.send().expect(200);
    await request(f.app)
      .post('/command')
      .set('Idempotency-Key', 'same-command-key')
      .set('x-test-actor', 'actor-2')
      .send({ value: 1 })
      .expect(403);
    expect(f.mutation).toHaveBeenCalledTimes(1);
  });
});
