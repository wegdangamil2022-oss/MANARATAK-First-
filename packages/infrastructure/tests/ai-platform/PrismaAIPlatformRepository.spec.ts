import { describe, expect, it, vi } from 'vitest';
import { PrismaAIPlatformRepository } from '../../src/ai-platform/PrismaAIPlatformRepository';

describe('PrismaAIPlatformRepository governance boundary', () => {
  it('rejects raw provider secrets before persistence', async () => {
    const transaction = vi.fn();
    const repository = new PrismaAIPlatformRepository({ $transaction: transaction });
    await expect(repository.upsert('providers', { key: 'provider', apiKey: 'forbidden' }, 'actor')).rejects.toThrow('AI_SECRET_MATERIAL_FORBIDDEN');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('writes registry, audit, and outbox evidence in one transaction', async () => {
    const saved = { id: 'registry-1', key: 'provider', resourceType: 'providers', status: 'DRAFT', secretReference: 'PROVIDER_API_KEY', configuration: { displayName: 'Provider' } };
    const tx = { $queryRaw: vi.fn().mockResolvedValue([]),
      aIRegistryRecord: { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn().mockResolvedValue(saved) },
      auditRecord: { create: vi.fn().mockResolvedValue({}) },
      transactionalOutboxRecord: { create: vi.fn().mockResolvedValue({}) },
    };
    const repository = new PrismaAIPlatformRepository({ $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) });
    await expect(repository.upsert('providers', { key: 'provider', displayName: 'Provider', status: 'DRAFT', secretReference: 'PROVIDER_API_KEY' }, 'actor')).resolves.toMatchObject({ key: 'provider', secretReference: 'PROVIDER_API_KEY' });
    expect(tx.aIRegistryRecord.upsert).toHaveBeenCalledOnce();
    expect(tx.auditRecord.create).toHaveBeenCalledOnce();
    expect(tx.transactionalOutboxRecord.create).toHaveBeenCalledOnce();
  });

  it('rejects self-approval inside the transaction before any state change', async () => {
    const tx = {
      aIPromptVersionRecord: {
        findUnique: vi.fn().mockResolvedValue({ id: 'v1', status: 'REVIEW', createdBy: 'author-1' }),
        updateMany: vi.fn(),
      },
    };
    const repository = new PrismaAIPlatformRepository({ $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) });
    await expect(repository.approvePromptVersion('prompt', 1, 'author-1')).rejects.toThrow('AI_PROMPT_SELF_APPROVAL_FORBIDDEN');
    expect(tx.aIPromptVersionRecord.updateMany).not.toHaveBeenCalled();
  });

  it('refuses prompt deployment by either maker or checker', async () => {
    for (const actor of ['author-1', 'reviewer-1']) {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        aIPromptVersionRecord: {
          findUnique: vi.fn().mockResolvedValue({ id: 'v1', status: 'APPROVED', createdBy: 'author-1', approvedBy: 'reviewer-1' }),
        },
        aIPromptDeploymentRecord: { create: vi.fn(), updateMany: vi.fn() },
      };
      const repository = new PrismaAIPlatformRepository({ $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) });
      await expect(repository.deployPrompt('prompt', 1, actor)).rejects.toThrow('AI_PROMPT_DEPLOYER_NOT_INDEPENDENT');
      expect(tx.aIPromptDeploymentRecord.create).not.toHaveBeenCalled();
    }
  });

  it('queries only due async jobs before pagination, oldest first', async () => {
    const findMany = vi.fn().mockResolvedValue([{ publicId: 'older-due' }]);
    const repository = new PrismaAIPlatformRepository({ aIAsyncJobRecord: { findMany } });
    const now = new Date('2026-10-11T12:00:00Z');
    expect(await repository.listClaimableAsyncJobs(5, now)).toEqual([{ publicId: 'older-due' }]);
    const query = findMany.mock.calls[0][0];
    expect(query.take).toBe(5);
    expect(query.orderBy).toEqual([{ createdAt: 'asc' }, { id: 'asc' }]);
    expect(query.where.OR).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 'RUNNING', leaseExpiresAt: { lte: now } }),
      expect.objectContaining({ status: 'RETRYING' }),
    ]));
  });


  it('requires independent evaluation review and rejects a second approval', async () => {
    const baseRun = {
      publicId: 'aiev_1', id: 'record-1', status: 'COMPLETED', targetEvidence: {
        submittedBy: 'author-1', executedBy: 'operator-1',
        definitionChecksum: 'definition-hash', resultChecksum: 'test-result-hash',
      },
      score: 1, results: [], safetyFailures: 0, targetChecksum: 'prompt-hash',
    };
    for (const [reviewer, record, expected] of [
      ['author-1', baseRun, 'AI_EVALUATION_INDEPENDENT_REVIEW_REQUIRED'],
      ['operator-1', baseRun, 'AI_EVALUATION_INDEPENDENT_REVIEW_REQUIRED'],
      ['reviewer-1', { ...baseRun, approvedBy: 'other-reviewer' }, 'AI_EVALUATION_ALREADY_APPROVED'],
      ['reviewer-1', baseRun, 'AI_EVALUATION_RESULT_EVIDENCE_CHANGED'],
    ] as const) {
      const tx = {
        aIEvaluationRunRecord: {
          findUnique: vi.fn().mockResolvedValue(record), updateMany: vi.fn(),
        },
      };
      const repository = new PrismaAIPlatformRepository({
        $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
      });
      await expect(repository.approveEvaluationRun('aiev_1', reviewer)).rejects.toThrow(expected);
      expect(tx.aIEvaluationRunRecord.updateMany).not.toHaveBeenCalled();
    }
  });


  it('refuses a direct incident status change without a governed event', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      aIRegistryRecord: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'incident-1', key: 'incident-1', resourceType: 'incidents',
          status: 'OPEN', configuration: { timeline: [] }, updatedAt: new Date('2026-10-11T12:00:00Z'),
        }),
        upsert: vi.fn(),
      },
    };
    const repository = new PrismaAIPlatformRepository({
      $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
    });
    await expect(repository.upsert('incidents', {
      key: 'incident-1', status: 'RESOLVED', expectedUpdatedAt: '2026-10-11T12:00:00Z', timeline: [],
    }, 'actor')).rejects.toThrow('AI_INCIDENT_STATUS_REQUIRES_GOVERNED_EVENT');
    expect(tx.aIRegistryRecord.upsert).not.toHaveBeenCalled();
  });

  it('denies skipping from OPEN to RESOLVED before appending incident events', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      aIRegistryRecord: {
        findUnique: vi.fn().mockResolvedValue({ id: 'incident-1', status: 'OPEN' }),
      },
      aIIncidentEventRecord: { create: vi.fn() },
    };
    const repository = new PrismaAIPlatformRepository({
      $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
    });
    await expect(repository.appendIncidentEvent('incident-1', {
      at: new Date('2026-10-11T12:00:00Z'), action: 'RESOLUTION_RECORDED',
      actorReferenceId: 'actor', note: 'not yet mitigated',
    })).rejects.toThrow('AI_INCIDENT_INVALID_TRANSITION');
    expect(tx.aIIncidentEventRecord.create).not.toHaveBeenCalled();
  });

  it('requires optimistic registry revision on every existing record update', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      aIRegistryRecord: {
        findUnique: vi.fn().mockResolvedValue({ id: 'model-1', status: 'DRAFT', updatedAt: new Date() }),
        upsert: vi.fn(),
      },
    };
    const repository = new PrismaAIPlatformRepository({
      $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
    });
    await expect(repository.upsert('models', { key: 'model-1', status: 'DRAFT' }, 'actor'))
      .rejects.toThrow('AI_REGISTRY_PRECONDITION_REQUIRED');
    expect(tx.aIRegistryRecord.upsert).not.toHaveBeenCalled();
  });


  it('refuses overlapping active price periods under model-scoped registry locks', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      aIRegistryRecord: {
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([{
          key: 'price-old',
          configuration: { modelKey: 'model-1', effectiveFrom: '2026-10-01T00:00:00Z', effectiveTo: null },
        }]),
        upsert: vi.fn(),
      },
    };
    const repo = new PrismaAIPlatformRepository({
      $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
    });
    await expect(repo.upsert('modelPrices', {
      key: 'price-new', modelKey: 'model-1', status: 'ACTIVE',
      effectiveFrom: '2026-10-10T00:00:00Z',
      effectiveTo: '2026-10-20T00:00:00Z', currency: 'USD',
      inputPricePerMillion: 2, outputPricePerMillion: 4,
    }, 'price-manager')).rejects.toThrow('AI_MODEL_PRICE_INTERVAL_OVERLAP');
    expect(tx.aIRegistryRecord.upsert).not.toHaveBeenCalled();
  });


  it('rejects a stale evaluation gate within the prompt deployment transaction', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      aIPromptVersionRecord: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'pv-1', status: 'APPROVED', promptKey: 'prompt-1',
          version: 1, checksum: 'target-checksum', createdBy: 'author',
          approvedBy: 'checker',
        }),
      },
      aIRegistryRecord: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'r1', key: 'prompt-1', capabilityKey: 'capability-1',
          status: 'REVIEW', configuration: {},
        }),
        findMany: vi.fn().mockResolvedValue([{
          key: 'gate-1', status: 'ACTIVE', configuration: {
            capabilityKey: 'capability-1',
            target: { type: 'PROMPT', key: 'prompt-1' },
            deploymentGate: { minimumScore: 0.9, maximumSafetyFailures: 0, requiresHumanApproval: true },
            dataset: [{ key: 'case-1', input: 'new test' }],
            evaluators: [{ key: 'exact', type: 'EXACT_MATCH' }],
          },
        }]),
      },
      aICapabilityPromptBindingRecord: { findUnique: vi.fn().mockResolvedValue(null) },
      aIEvaluationRunRecord: { findFirst: vi.fn().mockResolvedValue({
        status: 'COMPLETED', score: 1, safetyFailures: 0,
        approvedBy: 'reviewer', targetEvidence: { definitionChecksum: 'obsolete' },
      }) },
      aIPromptDeploymentRecord: { updateMany: vi.fn(), create: vi.fn() },
    };
    const repo = new PrismaAIPlatformRepository({
      $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
    });
    await expect(repo.deployPrompt('prompt-1', 1, 'deployer'))
      .rejects.toThrow('AI_EVALUATION_EXACT_GATE_EVIDENCE_REQUIRED:gate-1');
    expect(tx.aIPromptDeploymentRecord.updateMany).not.toHaveBeenCalled();
  });


  it('rejects requester rate/concurrency saturation atomically before creating billable work', async () => {
    for (const scenario of [
      { count: 2, active: 0, error: 'AI_REQUESTER_RATE_LIMIT_EXCEEDED' },
      { count: 1, active: 1, error: 'AI_REQUESTER_CONCURRENCY_EXCEEDED' },
    ]) {
      const tx = {
        aIExecutionRecord: {
          count: vi.fn()
            .mockResolvedValueOnce(0) // global minute
            .mockResolvedValueOnce(0) // global day
            .mockResolvedValueOnce(scenario.count)
            .mockResolvedValueOnce(scenario.active),
          create: vi.fn(),
        },
        aIUsageRecord: { findMany: vi.fn().mockResolvedValue([]) },
        aIQuotaReservationRecord: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
      };
      const repo = new PrismaAIPlatformRepository({
        $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
      });
      await expect(repo.createExecutionWithQuota({
        publicId: 'ai_scoped', consumerKey: 'shared',
        requesterReferenceId: 'operator-1', idempotencyKeyHash: null,
      } as any, {
        reservationKey: 'job-1', requestsPerMinute: 100,
        dailyRequestLimit: 1000, requesterRequestsPerMinute: 2,
        requesterConcurrentLimit: 1, monthlyTokenLimit: 10000,
        reservedTokens: 10, reservedCost: 0,
      })).rejects.toThrow(scenario.error);
      expect(tx.aIExecutionRecord.create).not.toHaveBeenCalled();
      expect(tx.aIQuotaReservationRecord.create).not.toHaveBeenCalled();
    }
  });


  it('fails closed before provider dispatch when cancellation loses a race', async () => {
    const tx = {
      aIExecutionRecord: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUniqueOrThrow: vi.fn(),
      },
      auditRecord: { create: vi.fn() },
      transactionalOutboxRecord: { create: vi.fn() },
    };
    const repo = new PrismaAIPlatformRepository({
      $transaction: (cb: (client: typeof tx) => unknown) => cb(tx),
    });
    await expect(repo.cancelUnstartedExecution('ai_running', 'student-1'))
      .rejects.toThrow('AI_EXECUTION_IN_FLIGHT_CANCELLATION_UNSUPPORTED');
    expect(tx.aIExecutionRecord.updateMany).toHaveBeenCalledWith({
      where: {
        publicId: 'ai_running', requesterReferenceId: 'student-1',
        status: { in: ['RECEIVED', 'QUEUED'] },
      },
      data: { status: 'CANCELLED' },
    });
    expect(tx.aIExecutionRecord.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(tx.auditRecord.create).not.toHaveBeenCalled();
  });

  it('atomically records a cancellation and governance audit before replying', async () => {
    const cancelled = { id: 'ai-id', publicId: 'ai_waiting', status: 'CANCELLED' };
    const tx = {
      aIExecutionRecord: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue(cancelled),
      },
      auditRecord: { create: vi.fn().mockResolvedValue({}) },
      transactionalOutboxRecord: { create: vi.fn().mockResolvedValue({}) },
    };
    const repo = new PrismaAIPlatformRepository({
      $transaction: (cb: (client: typeof tx) => unknown) => cb(tx),
    });
    await expect(repo.cancelUnstartedExecution('ai_waiting', 'student-1'))
      .resolves.toMatchObject(cancelled);
    expect(tx.auditRecord.create).toHaveBeenCalledOnce();
    expect(tx.transactionalOutboxRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({
        eventType: 'AI_EXECUTION_CANCELLED_BEFORE_DISPATCH',
      }) }),
    );
  });


  it('does not dispatch after a concurrent cancellation has won', async () => {
    const tx = { aIExecutionRecord: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      findUniqueOrThrow: vi.fn(),
    } };
    const repository = new PrismaAIPlatformRepository({
      $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
    });
    await expect(repository.updateExecution('ai_cancelled', { status: 'RUNNING' } as any))
      .rejects.toThrow('AI_EXECUTION_STATE_CONFLICT');
    expect(tx.aIExecutionRecord.updateMany).toHaveBeenCalledWith({
      where: { publicId: 'ai_cancelled',
        status: { in: ['RECEIVED', 'QUEUED', 'ACCEPTED'] } },
      data: { status: 'RUNNING' },
    });
    expect(tx.aIExecutionRecord.findUniqueOrThrow).not.toHaveBeenCalled();
  });


  it('renews only the same active worker lease, preserving its fencing token', async () => {
    const updateMany = vi.fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const repository = new PrismaAIPlatformRepository({
      aIAsyncJobRecord: { updateMany },
    });
    const lockedAt = new Date('2026-10-11T12:00:00Z');
    expect(await repository.renewAsyncJobLease('aij_1', { workerId: 'worker-1', lockedAt })).toBe(true);
    expect(await repository.renewAsyncJobLease('aij_1', { workerId: 'wrong-worker', lockedAt })).toBe(false);
    const { where, data } = updateMany.mock.calls[0][0];
    expect(where).toEqual({
      publicId: 'aij_1', status: 'RUNNING',
      lockedBy: 'worker-1', lockedAt,
      leaseExpiresAt: { gt: expect.any(Date) },
    });
    expect(data.leaseExpiresAt.getTime()).toBeGreaterThan(where.leaseExpiresAt.gt.getTime());
  });


  it('requires independent approval of the unchanged high-impact REVIEW revision', async () => {
    const effective = new Date('2026-10-11T10:00:00Z');
    for (const resource of ['guardrails', 'routingPolicies', 'consumers'] as const) {
      for (const scenario of [
        { author: 'maker', proposed: 'safe', reviewer: 'maker', error: 'AI_HIGH_IMPACT_INDEPENDENT_REVIEW_REQUIRED' },
        { author: 'maker', proposed: 'safe', reviewer: 'checker', updated: 'unsafe', error: 'AI_HIGH_IMPACT_REVIEWED_CONTENT_CHANGED' },
      ]) {
        const tx = {
          $queryRaw: vi.fn().mockResolvedValue([]),
          aIRegistryRecord: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'reg-1', key: 'policy', resourceType: resource,
              status: 'REVIEW', updatedBy: scenario.author,
              updatedAt: effective, configuration: { displayName: scenario.proposed, status: 'REVIEW' },
            }),
            upsert: vi.fn(),
          },
        };
        const repository = new PrismaAIPlatformRepository({
          $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
        });
        await expect(repository.upsert(resource, {
          key: 'policy', status: 'ACTIVE',
          displayName: scenario.updated ?? 'safe', expectedUpdatedAt: effective.toISOString(),
        }, scenario.reviewer)).rejects.toThrow(scenario.error);
        expect(tx.aIRegistryRecord.upsert).not.toHaveBeenCalled();
      }
    }
  });

  it('atomically activates only a different reviewer\'s previously staged policy', async () => {
    const effective = new Date('2026-10-11T10:00:00Z');
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      aIRegistryRecord: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'reg-1', key: 'policy', resourceType: 'guardrails', status: 'REVIEW',
          updatedBy: 'maker', updatedAt: effective,
          configuration: { displayName: 'Reviewed', status: 'REVIEW' },
        }),
        upsert: vi.fn().mockResolvedValue({
          id: 'reg-1', key: 'policy', status: 'ACTIVE',
          updatedAt: new Date('2026-10-11T10:01:00Z'),
          configuration: { displayName: 'Reviewed', status: 'ACTIVE' },
        }),
      },
      auditRecord: { create: vi.fn().mockResolvedValue({}) },
      transactionalOutboxRecord: { create: vi.fn().mockResolvedValue({}) },
    };
    const repository = new PrismaAIPlatformRepository({
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    });
    await expect(repository.upsert('guardrails', {
      key: 'policy', status: 'ACTIVE', displayName: 'Reviewed',
      expectedUpdatedAt: effective.toISOString(),
    }, 'checker')).resolves.toMatchObject({ status: 'ACTIVE' });
    expect(tx.aIRegistryRecord.upsert).toHaveBeenCalledOnce();
    expect(tx.auditRecord.create).toHaveBeenCalledOnce();
    expect(tx.transactionalOutboxRecord.create).toHaveBeenCalledOnce();
  });

  it('refuses unreviewed new activation or in-place active policy rewrites', async () => {
    for (const previous of [
      null,
      { id: 'reg-1', key: 'policy', status: 'ACTIVE',
        updatedBy: 'maker', updatedAt: new Date('2026-10-11T10:00:00Z'),
        configuration: { status: 'ACTIVE', displayName: 'Old' } },
    ]) {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        aIRegistryRecord: {
          findUnique: vi.fn().mockResolvedValue(previous),
          upsert: vi.fn(),
        },
      };
      const repository = new PrismaAIPlatformRepository({
        $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
      });
      await expect(repository.upsert('routingPolicies', {
        key: 'policy', status: 'ACTIVE', displayName: 'Unreviewed',
        ...(previous ? { expectedUpdatedAt: previous.updatedAt.toISOString() } : {}),
      }, 'maker')).rejects.toThrow(
        previous ? 'AI_HIGH_IMPACT_STAGED_CHANGE_REQUIRED' : 'AI_HIGH_IMPACT_REVIEW_REQUIRED',
      );
      expect(tx.aIRegistryRecord.upsert).not.toHaveBeenCalled();
    }
  });


  it('denies HIGH/CRITICAL resolution by the same mitigation author', async () => {
    for (const severity of ['HIGH', 'CRITICAL'] as const) {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        aIRegistryRecord: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'incident-1', status: 'MITIGATED', configuration: { severity },
          }),
          update: vi.fn(),
        },
        aIIncidentEventRecord: {
          findFirst: vi.fn().mockResolvedValue({
            action: 'MITIGATION_RECORDED', actorReferenceId: 'operator-1',
          }),
          create: vi.fn(),
        },
      };
      const repository = new PrismaAIPlatformRepository({
        $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
      });
      await expect(repository.appendIncidentEvent('incident-1', {
        at: new Date('2026-10-11T12:00:00Z'),
        action: 'RESOLUTION_RECORDED', actorReferenceId: 'operator-1',
      })).rejects.toThrow('AI_INCIDENT_INDEPENDENT_RESOLUTION_REQUIRED');
      expect(tx.aIIncidentEventRecord.findFirst).toHaveBeenCalledOnce();
      expect(tx.aIIncidentEventRecord.create).not.toHaveBeenCalled();
      expect(tx.aIRegistryRecord.update).not.toHaveBeenCalled();
    }
  });


  it('keeps embedding projections from different owner types and revisions separate', async () => {
    const tx = {
      aIEmbeddingRecord: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const repository = new PrismaAIPlatformRepository({
      $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
    });
    const common = {
      indexKey: 'kb', sourceReferenceId: '123', modelKey: 'embed',
      dimensions: 2,
      chunks: [{
        chunkKey: '1', chunkText: 'safe', embeddingRef: 'embed-1',
        checksum: 'checksum-1', metadata: { position: 0 },
      }],
    };
    await repository.replaceEmbeddings({ ...common, sourceType: 'scholarship', sourceVersion: 'v1' });
    await repository.replaceEmbeddings({ ...common, sourceType: 'university', sourceVersion: 'v1' });
    await repository.replaceEmbeddings({ ...common, sourceType: 'scholarship', sourceVersion: 'v2' });
    const identities = tx.aIEmbeddingRecord.deleteMany.mock.calls.map(([arg]) => arg.where.sourceReferenceId);
    expect(new Set(identities).size).toBe(3);
    expect(identities.every((id) => /^aisrc_[a-f0-9]{64}$/.test(id))).toBe(true);
    expect(tx.aIEmbeddingRecord.createMany.mock.calls[0][0].data[0].metadata)
      .toMatchObject({ sourceType: 'scholarship', sourceVersion: 'v1', position: 0 });
  });

  it('rejects oversized embedding batches and invalid model dimensions before mutation', async () => {
    const transaction = vi.fn();
    const repository = new PrismaAIPlatformRepository({ $transaction: transaction });
    const base = {
      indexKey: 'kb', sourceType: 'scholarship', sourceReferenceId: '123',
      sourceVersion: 'v1', modelKey: 'embed',
    };
    await expect(repository.replaceEmbeddings({
      ...base, dimensions: 5000, chunks: [],
    })).rejects.toThrow('AI_EMBEDDING_SOURCE_OR_BATCH_LIMIT_INVALID');
    await expect(repository.replaceEmbeddings({
      ...base, dimensions: 512,
      chunks: Array.from({ length: 257 }, (_, i) => ({
        chunkKey: String(i), chunkText: 'safe', checksum: 'sha',
        embeddingRef: 'ref',
      })),
    })).rejects.toThrow('AI_EMBEDDING_SOURCE_OR_BATCH_LIMIT_INVALID');
    expect(transaction).not.toHaveBeenCalled();
  });

});
