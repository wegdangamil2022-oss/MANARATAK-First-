import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import {
  type IAssetRecordRepository,
  StudentSavedItemType,
  StudentWorkspaceStatus,
} from '@manaratak/domain';
import type { IPrincipalAccessValidator, ISessionManager, ITokenProvider } from '@manaratak/core';
import {
  FinancePlatformUseCases,
  FinanceStudentUseCases,
  ProcessAssetLifecycleUseCase,
  StudentApplicationTrackerUseCases,
  StudentDashboardHydrationService,
  StudentSavedItemHydrationService,
  StudentServiceRequestUseCases,
  StudentWorkspaceUseCases,
} from '@manaratak/application';
import { PrismaApiIdempotencyStore } from '@manaratak/infrastructure';
import { StudentWorkspaceRouter } from '../../../../src/presentation/api/router/StudentWorkspaceRouter';

function classDouble<T extends object>(prototype: T, overrides: Partial<T> = {}): T {
  return Object.assign(Object.create(prototype) as T, overrides);
}

describe('StudentWorkspaceRouter', () => {
  const createUseCases = () => ({
    getWorkspace: vi.fn(),
    updatePrivacyConsent: vi.fn(),
    upsertWorkspace: vi.fn(),
    getDashboard: vi.fn(),
    listSavedItems: vi.fn(),
    saveItem: vi.fn(),
    removeSavedItem: vi.fn(),
    createCollection: vi.fn(),
  });

  const createApp = (useCases: ReturnType<typeof createUseCases>) => {
    const workspaceUseCases = classDouble(StudentWorkspaceUseCases.prototype, useCases);
    const tokenProvider: ITokenProvider = {
      generateTokens: vi.fn(),
      generateAccessToken: vi.fn(),
      generateRefreshToken: vi.fn(),
      verifyAccessToken: vi.fn().mockResolvedValue({ userId: 'student-1', sessionId: 'session-1' }),
      validateRefreshToken: vi.fn(),
    };
    const sessionManager: ISessionManager = {
      createSession: vi.fn(),
      revokeSession: vi.fn(),
      revokeAllSessions: vi.fn(),
      findRefreshSession: vi.fn(),
      consumeAndRotateRefreshSession: vi.fn(),
      isSessionActive: vi.fn().mockResolvedValue(true),
    };
    const principalAccessValidator: IPrincipalAccessValidator = {
      isAuthenticationAllowed: vi.fn().mockResolvedValue(true),
    };
    const apiIdempotencyStore = classDouble(PrismaApiIdempotencyStore.prototype, {
      begin: vi
        .fn()
        .mockResolvedValue({ kind: 'STARTED', scopeHash: 'scope-1', leaseToken: 'lease-1' }),
      complete: vi.fn().mockResolvedValue(undefined),
    });
    const assetRecordRepository: IAssetRecordRepository & {
      queryAdmin(
        input: unknown,
      ): Promise<{ items: unknown[]; nextCursor: string | null; hasMore: boolean }>;
    } = {
      save: vi.fn(),
      findById: vi.fn(),
      findByReference: vi.fn(),
      findByOwner: vi.fn(),
      queryAdmin: vi.fn().mockResolvedValue({ items: [], nextCursor: null, hasMore: false }),
    };
    const app = express();
    app.use(express.json());
    app.use(
      '/student',
      StudentWorkspaceRouter.create({
        studentWorkspaceUseCases: workspaceUseCases,
        studentApplicationTrackerUseCases: classDouble(StudentApplicationTrackerUseCases.prototype),
        financeStudentUseCases: classDouble(FinanceStudentUseCases.prototype),
        financePlatformUseCases: classDouble(FinancePlatformUseCases.prototype),
        studentSavedItemHydrationService: classDouble(StudentSavedItemHydrationService.prototype),
        studentDashboardHydrationService: classDouble(StudentDashboardHydrationService.prototype, {
          getDashboard: useCases.getDashboard,
        }),
        studentServiceRequestUseCases: classDouble(StudentServiceRequestUseCases.prototype),
        tokenProvider,
        sessionManager,
        principalAccessValidator,
        apiIdempotencyStore,
        assetRecordRepository,
        processAssetLifecycleUseCase: classDouble(ProcessAssetLifecycleUseCase.prototype),
      }),
    );
    return app;
  };

  it('returns a student dashboard summary', async () => {
    const useCases = createUseCases();
    useCases.getDashboard.mockResolvedValue({
      workspace: { studentReferenceId: 'student-1', status: StudentWorkspaceStatus.ACTIVE },
      savedItems: [],
      certificateCount: 1,
      activeCourseEnrollmentCount: 2,
      completedCourseEnrollmentCount: 1,
    });
    const app = createApp(useCases);

    const res = await request(app)
      .get('/student/student-1/dashboard')
      .set('Authorization', 'Bearer valid-student-token');

    expect(res.status).toBe(200);
    expect(res.body.certificateCount).toBe(1);
  });

  it('derives the normal dashboard path from the authenticated identity', async () => {
    const useCases = createUseCases();
    useCases.getDashboard.mockResolvedValue({ workspace: { studentReferenceId: 'student-1' } });
    const res = await request(createApp(useCases))
      .get('/student/dashboard')
      .set('Authorization', 'Bearer valid-student-token');

    expect(res.status).toBe(200);
    expect(useCases.getDashboard).toHaveBeenCalledWith('student-1');
  });

  it('saves a personal item reference', async () => {
    const useCases = createUseCases();
    useCases.saveItem.mockResolvedValue({
      id: 'saved-1',
      studentReferenceId: 'student-1',
      entityType: StudentSavedItemType.COURSE,
      entityId: 'course-1',
      savedAt: new Date(),
      updatedAt: new Date(),
    });
    const app = createApp(useCases);

    const res = await request(app)
      .post('/student/student-1/saved-items')
      .set('Authorization', 'Bearer valid-student-token')
      .set('Idempotency-Key', 'student-save-item-1')
      .send({ entityType: StudentSavedItemType.COURSE, entityId: 'course-1' });

    expect(res.status).toBe(201);
    expect(useCases.saveItem).toHaveBeenCalledWith(
      expect.objectContaining({
        studentReferenceId: 'student-1',
        entityType: StudentSavedItemType.COURSE,
      }),
    );
  });

  it('denies access to another student workspace', async () => {
    const useCases = createUseCases();
    const app = createApp(useCases);

    const res = await request(app)
      .get('/student/student-2/dashboard')
      .set('Authorization', 'Bearer valid-student-token');

    expect(res.status).toBe(403);
    expect(useCases.getDashboard).not.toHaveBeenCalled();
  });

  it('requires an authenticated student session', async () => {
    const useCases = createUseCases();
    const app = createApp(useCases);

    const res = await request(app).get('/student/student-1/dashboard');

    expect(res.status).toBe(401);
  });

  it('routes privacy toggles through the consent command with authenticated actor evidence', async () => {
    const useCases = createUseCases();
    useCases.updatePrivacyConsent.mockResolvedValue({ id: 'decision-1', workspaceVersion: 3 });
    const preferences = {
      retainSearchHistory: false,
      allowPersonalization: true,
      allowProductAnalytics: true,
      publicProfileEnabled: false,
    };
    const res = await request(createApp(useCases))
      .put('/student/privacy-consent')
      .set('Authorization', 'Bearer valid-student-token')
      .set('Idempotency-Key', 'student-privacy-1')
      .send({ expectedVersion: 2, purpose: 'student settings', privacyPreferences: preferences });
    expect(res.status).toBe(200);
    expect(useCases.updatePrivacyConsent).toHaveBeenCalledWith(
      expect.objectContaining({
        studentReferenceId: 'student-1',
        actorId: 'student-1',
        expectedVersion: 2,
        privacyPreferences: preferences,
      }),
    );
  });

  it('rejects privacy fields on generic workspace updates instead of stripping them', async () => {
    const useCases = createUseCases();
    const res = await request(createApp(useCases))
      .put('/student/workspace')
      .set('Authorization', 'Bearer valid-student-token')
      .set('Idempotency-Key', 'student-workspace-1')
      .send({ expectedVersion: 1, privacyPreferences: { retainSearchHistory: false } });
    expect(res.status).toBe(400);
    expect(useCases.upsertWorkspace).not.toHaveBeenCalled();
  });

  it.each(['FAVORITES', 'SMART'])('rejects public collection type spoofing: %s', async (type) => {
    const useCases = createUseCases();
    const res = await request(createApp(useCases))
      .post('/student/collections')
      .set('Authorization', 'Bearer valid-student-token')
      .set('Idempotency-Key', `student-collection-${type.toLowerCase()}`)
      .send({ name: 'قائمتي', type });
    expect(res.status).toBe(400);
    expect(useCases.createCollection).not.toHaveBeenCalled();
  });
});
