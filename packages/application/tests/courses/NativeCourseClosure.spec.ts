import { describe, it, expect, vi } from 'vitest';
import {
  CourseAdminCommandUseCases,
  type CourseAdminScope,
} from '../../src/courses/use-cases/CourseAdminCommandUseCases';
import { AssetValidator } from '../../src/asset-platform/utils/AssetValidator';
import { IngestAssetUseCase } from '../../src/asset-platform/use-cases/IngestAssetUseCase';
import type { AtomicDomainMutationCoordinator } from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
import type {
  ICourseRepository,
  ILearningPathRepository,
  AtomicPersistenceContext,
} from '@manaratak/domain';

describe('native course closure boundaries', () => {
  it('resumes only the same initiated course upload and rejects provider locator substitution', async () => {
    const record = {
      owner: { ownerId: 'course', ownerType: 'COURSE' },
      state: 'INITIATED',
      locator: { value: 'quarantine:original' },
      metadata: {
        extraMetadata: { purpose: 'COURSE_LESSON_MEDIA' },
        originalFilename: 'video.webm',
        mimeType: 'video/webm',
        byteSize: 100,
      },
    };
    const refreshUploadGrant = vi
      .fn()
      .mockResolvedValue({
        locator: record.locator,
        uploadUrl: 'https://media.example.invalid/retry',
        method: 'PUT',
        headers: {},
        expiresAt: new Date(Date.now() + 60000),
      });
    const uc = new IngestAssetUseCase(
      { findById: async () => record } as never,
      { refreshUploadGrant } as never,
    );
    expect((await uc.refreshCourseMediaUpload('asset', 'course')).assetId).toBe('asset');
    refreshUploadGrant.mockResolvedValueOnce({ locator: { value: 'quarantine:other' } });
    await expect(uc.refreshCourseMediaUpload('asset', 'course')).rejects.toThrow(
      'LOCATOR_MISMATCH',
    );
    record.state = 'ACTIVE';
    await expect(uc.refreshCourseMediaUpload('asset', 'course')).rejects.toThrow('NOT_AVAILABLE');
    record.state = 'INITIATED';
    await expect(uc.refreshCourseMediaUpload('asset', 'another-course')).rejects.toThrow(
      'NOT_AVAILABLE',
    );
    expect(refreshUploadGrant).toHaveBeenCalledTimes(2);
  });
  it('duplicates a published source without bumping its version and records source and target in the atomic command', async () => {
    const update = vi.fn(),
      audit: unknown[] = [];
    const courses = {
      withTransaction: () => courses,
      assertCurrentVersion: vi.fn(),
      findById: vi.fn(async (id: string) =>
        id === 'source'
          ? { id, version: 7, status: 'PUBLISHED' }
          : { id, version: 2, status: 'DRAFT' },
      ),
      update,
    };
    const paths = { withTransaction: () => paths };
    const atomic = {
      execute: vi.fn(
        async (
          definition: unknown,
          fn: (context: AtomicPersistenceContext) => Promise<unknown>,
        ) => {
          audit.push(definition);
          return fn({ boundaryId: 'native-copy-unit' });
        },
      ),
    } as unknown as AtomicDomainMutationCoordinator;
    const uc = new CourseAdminCommandUseCases(
      courses as unknown as ICourseRepository,
      paths as unknown as ILearningPathRepository,
      atomic,
      () => ({}) as CourseAdminScope,
    );
    const result = await uc.execute(
      'COURSE',
      'source',
      'COURSE_DUPLICATE',
      { actorId: 'owner', reason: 'Create independent draft', expectedVersion: 7 },
      async () => ({ id: 'copy' }),
    );
    expect(result.version).toBe(2);
    expect(update).not.toHaveBeenCalled();
    expect(courses.assertCurrentVersion).toHaveBeenCalledWith('source', 7);
    expect(JSON.stringify(audit)).toContain('sourceCourseId');
    expect(JSON.stringify(audit)).toContain('copy');
    await expect(
      uc.execute(
        'COURSE',
        'source',
        'COURSE_DUPLICATE',
        { actorId: 'owner', reason: 'Invalid copy', expectedVersion: 7 },
        async () => ({ id: 'source' }),
      ),
    ).rejects.toThrow('COPY_RESULT_INVALID');
    await expect(
      uc.execute(
        'COURSE',
        'source',
        'ADMIN_PATCH',
        { actorId: 'owner', reason: 'Must not mutate published source', expectedVersion: 7 },
        async () => ({}),
      ),
    ).rejects.toThrow('PUBLISHED_STRUCTURE_IMMUTABLE');
  });
  const base = {
    ownerType: 'COURSE',
    ownerId: 'native-course',
    assetReference: 'COURSE-LESSON-test',
    classification: 'INTERNAL',
    originalFilename: 'lecture.webm',
    fileExtension: 'webm',
    mimeType: 'video/webm',
    byteSize: 1024,
  };
  it('admits scoped course video, audio and subtitles without widening general uploads', () => {
    expect(() => AssetValidator.validateCourseMedia(base)).not.toThrow();
    expect(() =>
      AssetValidator.validateCourseMedia({
        ...base,
        originalFilename: 'lecture.wav',
        fileExtension: 'wav',
        mimeType: 'audio/wav',
      }),
    ).not.toThrow();
    expect(() =>
      AssetValidator.validateCourseMedia({
        ...base,
        originalFilename: 'lecture.vtt',
        fileExtension: 'vtt',
        mimeType: 'text/vtt',
      }),
    ).not.toThrow();
    expect(() => AssetValidator.validate(base)).toThrow('Unsupported file extension');
  });
  it.each([
    { ownerType: 'STUDENT' },
    { assetReference: 'STUDENT-private' },
    { classification: 'PUBLIC' },
    { byteSize: 64 * 1024 * 1024 + 1 },
    { originalFilename: '../lecture.webm' },
    { mimeType: 'text/html' },
  ])('rejects forged course media policy %j', (override) => {
    expect(() => AssetValidator.validateCourseMedia({ ...base, ...override })).toThrow();
  });
});
