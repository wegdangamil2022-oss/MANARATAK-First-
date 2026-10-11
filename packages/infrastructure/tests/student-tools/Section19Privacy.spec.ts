import { describe, expect, it, vi } from 'vitest';
import { StudentPrivateResultProtector } from '../../src/students/StudentPrivateResultProtector';
import { EnvironmentStudentToolResultProtector } from '../../src/student-tools/EnvironmentStudentToolResultProtector';
import {
  Phase15StudentContextGateway,
  Phase15StudentToolSaveGateway,
  Phase17StudentToolsAIConsumerGateway,
  CanonicalScholarshipRecommendationGateway,
} from '../../src/student-tools/StudentToolGateways';
import { PrismaStudentWorkspaceRepository } from '../../src/students/PrismaStudentWorkspaceRepository';
const first = '11'.repeat(32),
  second = '22'.repeat(32);

describe('Section 19 cryptographic custody', () => {
  for (const [name, Factory, keyName] of [
    ['transient', EnvironmentStudentToolResultProtector, 'STUDENT_TOOL_RESULT_KEY'],
    ['P15 durable', StudentPrivateResultProtector, 'STUDENT_PRIVATE_RESULT_KEY'],
  ] as const) {
    it(`${name} supports grace rotation and revocation without plaintext fallback`, () => {
      const old = new Factory(keyName, { [keyName]: first });
      const value = { secret: 'private letter content' };
      const envelope = old.protect(value);
      expect(JSON.stringify(envelope)).not.toContain(value.secret);
      const rotated = new Factory(keyName, { [keyName]: second, [`${keyName}_PREVIOUS`]: first });
      expect(rotated.unprotect(envelope)).toEqual(value);
      expect(rotated.protect(value).keyVersion).not.toBe(envelope.keyVersion);
      expect(() => new Factory(keyName, { [keyName]: second }).unprotect(envelope)).toThrow(
        'KEY_VERSION_UNAVAILABLE',
      );
      expect(() =>
        rotated.unprotect({ ...envelope, authTag: Buffer.alloc(16).toString('base64') }),
      ).toThrow();
    });
    it(`${name} rejects oversized and malformed previous-key configuration`, () => {
      const configured = new Factory(keyName, {
        [keyName]: first,
        [`${keyName}_PREVIOUS`]: [first, second, first, second].join(','),
      });
      expect(() => configured.unprotect(configured.protect({}))).toThrow('KEYRING_LIMIT');
      const malformed = new Factory(keyName, {
        [keyName]: first,
        [`${keyName}_PREVIOUS`]: 'invalid',
      });
      expect(() => malformed.unprotect(malformed.protect({}))).toThrow('PREVIOUS_KEY_INVALID');
    });
  }
  it('P18 saves via the P15 encrypted command and never generic JSON metadata', async () => {
    const owner = {
      savePrivateToolResult: vi.fn().mockResolvedValue({ savedReference: 'opaque' }),
      saveItem: vi.fn(),
    };
    await expect(
      new Phase15StudentToolSaveGateway(owner as any).savePrivateResult({
        studentReference: 'owner',
        executionId: 'stx',
        toolKey: 'letter',
        resultReference: 'r',
        result: { draft: 'PRIVATE' } as any,
      }),
    ).resolves.toEqual({ savedReference: 'opaque' });
    expect(owner.saveItem).not.toHaveBeenCalled();
    expect(owner.savePrivateToolResult).toHaveBeenCalledWith(
      expect.objectContaining({ studentReferenceId: 'owner' }),
    );
  });
  it('rejects missing P15 encrypted save capability', async () => {
    await expect(
      new Phase15StudentToolSaveGateway({ saveItem: vi.fn() } as any).savePrivateResult({} as any),
    ).rejects.toThrow('STUDENT_PRIVATE_RESULT_NOT_CONFIGURED');
  });
  it('withholds stored profile fields after personalization consent withdrawal', async () => {
    const repository = {
      findWorkspace: vi.fn().mockResolvedValue({
        metadata: { targetDegree: 'PRIVATE' },
        privacyPreferences: { allowPersonalization: false },
      }),
    };
    expect(
      await new Phase15StudentContextGateway(repository as any).getMinimalContext('owner'),
    ).toBeNull();
    repository.findWorkspace.mockResolvedValue({
      metadata: { targetDegree: 'Masters' },
      privacyPreferences: { allowPersonalization: true },
    });
    expect(
      await new Phase15StudentContextGateway(repository as any).getMinimalContext('owner'),
    ).toEqual(expect.objectContaining({ targetDegree: 'Masters' }));
  });
  it('list DTO strips legacy plaintext and new ciphertext', async () => {
    const db = {
      studentSavedItem: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'saved',
            entityType: 'STUDENT_TOOL',
            entityId: 'stx',
            metadata: { privateResult: 'PRIVATE' },
            privateResultEnvelope: { ciphertext: 'ENCRYPTED' },
            privateResultExpiresAt: new Date(),
          },
        ]),
      },
    };
    const result = await new PrismaStudentWorkspaceRepository(db as any).listSavedItems('owner');
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
    expect(JSON.stringify(result)).not.toContain('ENCRYPTED');
    expect(result[0].metadata).toEqual({ artifactReference: 'stx' });
  });
  it('prevents generic save bypass with private metadata', async () => {
    await expect(
      new PrismaStudentWorkspaceRepository({} as any).saveItem({
        entityType: 'STUDENT_TOOL',
        metadata: { privateResult: 'PRIVATE' },
      } as any),
    ).rejects.toThrow('STUDENT_PRIVATE_RESULT_COMMAND_REQUIRED');
  });
  it('checks private consent and private-capable readiness before P17 dispatch', async () => {
    const orchestrator = {
      executeCapability: vi.fn(),
      capabilityReadiness: vi.fn().mockResolvedValue({ ready: false }),
    };
    const gateway = new Phase17StudentToolsAIConsumerGateway(orchestrator as any);
    const request = {
      consumerKey: 'phase18-student-tools',
      capabilityKey: 'student-tools.scholarship-recommendation.rank',
      dataClassification: 'PRIVATE_STUDENT_DATA',
      payload: { private: 'PRIVATE' },
      locale: 'en',
      privacyConsent: false,
    } as any;
    expect((await gateway.executeCapability(request)).status).toBe('BLOCKED');
    expect(orchestrator.capabilityReadiness).not.toHaveBeenCalled();
    expect((await gateway.executeCapability({ ...request, privacyConsent: true })).status).toBe(
      'NOT_CONFIGURED',
    );
    expect(orchestrator.capabilityReadiness).toHaveBeenCalledWith(
      expect.objectContaining({ dataClassification: 'STUDENT_PRIVATE' }),
    );
    expect(orchestrator.executeCapability).not.toHaveBeenCalled();
  });
  it('keeps public data classification for a truly public capability payload', async () => {
    const orchestrator = {
      capabilityReadiness: vi.fn().mockResolvedValue({ ready: true }),
      executeCapability: vi
        .fn()
        .mockResolvedValue({ status: 'COMPLETED', result: '{}', executionPublicId: 'ai1' }),
    };
    await new Phase17StudentToolsAIConsumerGateway(orchestrator as any).executeCapability({
      dataClassification: 'CANONICAL_PUBLIC_DATA',
      payload: { universityIds: ['public'] },
    } as any);
    expect(orchestrator.executeCapability).toHaveBeenCalledWith(
      expect.objectContaining({ dataClassification: 'PUBLIC' }),
    );
  });
  it('reads a fixed bounded scholarship page rather than scanning the catalog', async () => {
    const repository = {
      listPublished: vi.fn().mockResolvedValue({
        data: Array.from({ length: 25 }, (_, i) => ({
          publicId: `s${i}`,
          slug: `s${i}`,
          displayName: 'Grant',
          publicationStatus: 'PUBLISHED',
        })),
        hasMore: true,
        nextCursor: 'more',
      }),
    };
    const gateway = new CanonicalScholarshipRecommendationGateway(
      repository as any,
      {} as any,
      {} as any,
    );
    expect(await gateway.findPublishedCandidates({ countries: [] })).toHaveLength(25);
    expect(repository.listPublished).toHaveBeenCalledTimes(1);
    expect(repository.listPublished).toHaveBeenCalledWith(expect.objectContaining({ limit: 25 }));
  });
});

describe('Section 19 authorized P15 result retrieval', () => {
  const harness = () => {
    const expiresAt = new Date(Date.now() + 60000);
    const protector = new StudentPrivateResultProtector('STUDENT_PRIVATE_RESULT_KEY', {
      STUDENT_PRIVATE_RESULT_KEY: first,
    });
    let artifact: any = {
      id: 'saved',
      studentReferenceId: 'owner',
      entityType: 'STUDENT_TOOL',
      entityId: 'stx',
      privateResultExpiresAt: expiresAt,
      privateResultEnvelope: protector.protect({
        purpose: 'STUDENT_TOOL_RESULT',
        owner: 'owner',
        executionId: 'stx',
        expiresAt: expiresAt.toISOString(),
        result: { draft: 'PRIVATE' },
      }),
    };
    const db = {
      $queryRaw: vi.fn(),
      studentWorkspace: {
        findUnique: vi.fn().mockResolvedValue({ id: 'workspace', status: 'ACTIVE' }),
      },
      studentSavedItem: {
        findFirst: vi
          .fn()
          .mockImplementation(({ where }) =>
            Promise.resolve(
              where.studentReferenceId === artifact.studentReferenceId ? artifact : null,
            ),
          ),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    return {
      repo: new PrismaStudentWorkspaceRepository(db as any, undefined, protector),
      db,
      set: (patch: any) => {
        artifact = { ...artifact, ...patch };
      },
    };
  };
  it('decrypts only for the exact student owner', async () => {
    const f = harness();
    expect(await f.repo.readPrivateToolResult('owner', 'saved')).toEqual({ draft: 'PRIVATE' });
    await expect(f.repo.readPrivateToolResult('attacker', 'saved')).rejects.toThrow(
      'STUDENT_PRIVATE_RESULT_NOT_FOUND',
    );
  });
  it('rejects swapped ciphertext context even within one student account', async () => {
    const f = harness();
    f.set({ entityId: 'different-execution' });
    await expect(f.repo.readPrivateToolResult('owner', 'saved')).rejects.toThrow(
      'STUDENT_PRIVATE_RESULT_BINDING_INVALID',
    );
  });
  it('clears expired ciphertext and never returns plaintext after TTL', async () => {
    const f = harness();
    f.set({ privateResultExpiresAt: new Date(0) });
    await expect(f.repo.readPrivateToolResult('owner', 'saved')).rejects.toThrow(
      'STUDENT_PRIVATE_RESULT_EXPIRED',
    );
    expect(f.db.studentSavedItem.updateMany).toHaveBeenCalledOnce();
  });
  it('denies retrieval from suspended workspace', async () => {
    const f = harness();
    f.db.studentWorkspace.findUnique.mockResolvedValue({ id: 'workspace', status: 'SUSPENDED' });
    await expect(f.repo.readPrivateToolResult('owner', 'saved')).rejects.toThrow(
      'STUDENT_WORKSPACE_SUSPENDED',
    );
  });
});
