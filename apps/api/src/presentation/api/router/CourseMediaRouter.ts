import { randomUUID } from 'node:crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { readReviewReasonHeader } from '@manaratak/shared';
import {
  AssetId,
  AssetSecurityClassification,
  AssetRetentionCategory,
  type IAssetRecordRepository,
  type IAuditRecordRepository,
} from '@manaratak/domain';
import type {
  AdminCourseUseCases,
  CourseCurriculumUseCases,
  IngestAssetUseCase,
  ProcessAssetLifecycleUseCase,
} from '@manaratak/application';
import { AuditHelper } from '../../audit/AuditHelper.js';

export interface CourseMediaCradle {
  adminCourseUseCases: AdminCourseUseCases;
  courseCurriculumUseCases: CourseCurriculumUseCases;
  ingestAssetUseCase?: IngestAssetUseCase;
  processAssetLifecycleUseCase?: ProcessAssetLifecycleUseCase;
  assetRecordRepository?: IAssetRecordRepository;
  auditRecordRepo?: IAuditRecordRepository;
}

/** Mounted behind the existing course permission/MFA/CSRF/idempotency boundary.
 * Upload objects remain owned by EAP. Linking to curriculum is a separate,
 * versioned course command and is allowed only after verified ACTIVE status. */
export class CourseMediaRouter {
  static create(cradle: CourseMediaCradle) {
    const router = Router({ mergeParams: true });
    const wrap =
      (fn: (req: Request, res: Response) => Promise<unknown>) =>
      (req: Request, res: Response, next: NextFunction) => {
        void Promise.resolve()
          .then(() => fn(req, res))
          .catch((error) => {
            const code = error instanceof Error ? error.message : '';
            const status =
              code === 'COURSE_MEDIA_ASSET_NOT_FOUND'
                ? 404
                : [
                      'COURSE_VERSION_CONFLICT',
                      'PUBLISHED_OR_ARCHIVED_COURSE_CONTENT_MUTATION_FORBIDDEN',
                      'COURSE_MEDIA_PROCESSING_NOT_COMPLETE',
                    ].includes(code)
                  ? 409
                  : code === 'COURSE_VERSION_PRECONDITION_REQUIRED'
                    ? 428
                    : code === 'COURSE_MEDIA_PROVIDER_UNAVAILABLE' ||
                        code === 'COURSE_MEDIA_UPLOAD_PROVIDER_UNAVAILABLE'
                      ? 503
                      : /^(COURSE_MEDIA_.*INVALID|COURSE_MEDIA_.*MISMATCH|NATIVE_COURSE_REQUIRED|COURSE_CURRICULUM_SCOPE_MISMATCH)$/.test(
                            code,
                          )
                        ? 400
                        : 0;
            if (status) {
              res.status(status).json({ error: code });
              return;
            }
            next(error);
          });
      };
    const empty = z.object({}).strict();
    const course = async (req: Request, write = false) => {
      const row = await cradle.adminCourseUseCases.getCourse(req.params.id);
      if (row.originType !== 'NATIVE_MANARATAK_COURSE') throw Error('NATIVE_COURSE_REQUIRED');
      if (write) {
        if (!req.authUserId) throw Error('AUTHENTICATED_ADMIN_ACTOR_REQUIRED');
        z.string()
          .trim()
          .min(3)
          .max(2000)
          .parse(
            readReviewReasonHeader(req.get('X-Review-Reason'), req.get('X-Review-Reason-Encoding')),
          );
        const raw = req.get('If-Match'),
          match = raw && /^(?:"(\d+)"|(\d+))$/.exec(raw);
        if (!match) throw Error('COURSE_VERSION_PRECONDITION_REQUIRED');
        if (Number(match[1] ?? match[2]) !== row.version) throw Error('COURSE_VERSION_CONFLICT');
        if (['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(row.status))
          throw Error('PUBLISHED_OR_ARCHIVED_COURSE_CONTENT_MUTATION_FORBIDDEN');
      }
      return row;
    };
    const ownedAsset = async (req: Request) => {
      const row = await cradle.assetRecordRepository?.findById(
        new AssetId(z.string().uuid().parse(req.params.assetId)),
      );
      if (
        !row ||
        row.owner.ownerId !== req.params.id ||
        row.owner.ownerType !== 'COURSE' ||
        row.metadata.extraMetadata?.purpose !== 'COURSE_LESSON_MEDIA'
      )
        throw Error('COURSE_MEDIA_ASSET_NOT_FOUND');
      return row;
    };
    const status = (row: Awaited<ReturnType<typeof ownedAsset>>) => ({
      assetId: row.id.value,
      state: row.state,
      lessonId: row.metadata.extraMetadata?.lessonId,
      filename: row.metadata.originalFilename,
      mimeType: row.metadata.mimeType,
      byteSize: row.metadata.byteSize,
      uploadVerified: row.uploadVerification?.signatureVerified === true,
      scan: row.malwareScan?.status ?? null,
      sanitized: Boolean(row.sanitization),
    });
    const audit = (req: Request, action: string, targetId: string) =>
      AuditHelper.recordMutation(cradle.auditRecordRepo, req, {
        action,
        category: 'ASSET_PLATFORM',
        targetType: 'ASSET',
        targetId,
        result: 'SUCCESS',
        metadata: {
          courseId: req.params.id,
          reason: readReviewReasonHeader(
            req.get('X-Review-Reason'),
            req.get('X-Review-Reason-Encoding'),
          ),
        },
      });
    router.get(
      '/capabilities',
      wrap(async (req, res) => {
        await course(req);
        const caps = cradle.processAssetLifecycleUseCase?.mediaCapabilities() ?? {
          upload: false,
          delivery: false,
          scanning: false,
          sanitization: false,
        };
        res.setHeader('Cache-Control', 'no-store');
        res.json({ ...caps, maxMediaBytes: 64 * 1024 * 1024, maxTextBytes: 2 * 1024 * 1024 });
      }),
    );
    router.post(
      '/lessons/:lessonId/uploads',
      wrap(async (req, res) => {
        await course(req, true);
        const snapshot = await cradle.courseCurriculumUseCases.getCurriculumSnapshot(req.params.id);
        const lesson = snapshot.lessons.find(
          (row) =>
            row.id === req.params.lessonId &&
            row.status !== 'ARCHIVED' &&
            snapshot.modules.some(
              (module) => module.id === row.moduleId && module.status !== 'ARCHIVED',
            ),
        );
        if (!lesson) throw Error('COURSE_CURRICULUM_SCOPE_MISMATCH');
        const { rightsSource, attribution, ...body } = z
          .object({
            originalFilename: z.string().min(1).max(500),
            fileExtension: z.string().min(1).max(12),
            mimeType: z.string().min(1).max(100),
            byteSize: z
              .number()
              .int()
              .positive()
              .max(64 * 1024 * 1024),
            rightsSource: z.string().trim().min(3).max(2000),
            attribution: z.string().trim().max(2000).default(''),
          })
          .strict()
          .parse(req.body);
        const capabilities = cradle.processAssetLifecycleUseCase?.mediaCapabilities();
        if (
          !cradle.ingestAssetUseCase ||
          !capabilities ||
          !Object.values(capabilities).every(Boolean)
        )
          return res.status(503).json({ error: 'COURSE_MEDIA_PROVIDER_UNAVAILABLE' });
        const id = randomUUID(),
          result = await cradle.ingestAssetUseCase.requestCourseMediaUpload(
            {
              ...body,
              assetId: id,
              assetReference: 'COURSE-LESSON-' + id,
              ownerId: req.params.id,
              ownerType: 'COURSE',
              classification: AssetSecurityClassification.INTERNAL,
              retentionCategory: AssetRetentionCategory.PERMANENT,
            },
            lesson.id,
            req.authUserId!,
            { rightsSource, attribution },
          );
        await audit(req, 'COURSE_MEDIA_UPLOAD_ALLOCATED', id);
        res.status(201).json({
          assetId: result.assetId,
          uploadGrant: result.uploadGrant,
          state: result.lifecycleState,
        });
      }),
    );
    router.get(
      '/:assetId',
      wrap(async (req, res) => {
        await course(req);
        res.setHeader('Cache-Control', 'no-store');
        res.json(status(await ownedAsset(req)));
      }),
    );
    router.post(
      '/:assetId/refresh-upload',
      wrap(async (req, res) => {
        await course(req, true);
        empty.parse(req.body);
        await ownedAsset(req);
        if (!cradle.ingestAssetUseCase) throw Error('COURSE_MEDIA_UPLOAD_PROVIDER_UNAVAILABLE');
        const result = await cradle.ingestAssetUseCase.refreshCourseMediaUpload(
          req.params.assetId,
          req.params.id,
        );
        await audit(req, 'COURSE_MEDIA_UPLOAD_RESUMED', req.params.assetId);
        res.json({ assetId: result.assetId, uploadGrant: result.uploadGrant, state: 'INITIATED' });
      }),
    );
    router.post(
      '/:assetId/finalize',
      wrap(async (req, res) => {
        await course(req, true);
        empty.parse(req.body);
        await ownedAsset(req);
        if (!cradle.processAssetLifecycleUseCase) throw Error('COURSE_MEDIA_PROVIDER_UNAVAILABLE');
        await cradle.processAssetLifecycleUseCase.finalizeUploadedAsset({
          assetId: req.params.assetId,
        });
        await audit(req, 'COURSE_MEDIA_UPLOAD_FINALIZED', req.params.assetId);
        res.json(status(await ownedAsset(req)));
      }),
    );
    router.post(
      '/:assetId/process',
      wrap(async (req, res) => {
        await course(req, true);
        empty.parse(req.body);
        let row = await ownedAsset(req);
        const process = cradle.processAssetLifecycleUseCase;
        if (!process) throw Error('COURSE_MEDIA_PROVIDER_UNAVAILABLE');
        if (
          row.state === 'QUARANTINED' ||
          (row.state === 'VALIDATING' && row.malwareScan?.status !== 'PASSED')
        ) {
          await process.validateAsset({ assetId: row.id.value });
          row = await ownedAsset(req);
        }
        if (row.state === 'VALIDATING' && row.malwareScan?.status === 'PASSED') {
          await process.sanitizeAsset({ assetId: row.id.value });
          row = await ownedAsset(req);
        }
        if (row.state === 'SANITIZING') await process.activateAsset({ assetId: row.id.value });
        row = await ownedAsset(req);
        if (row.state !== 'ACTIVE') throw Error('COURSE_MEDIA_PROCESSING_NOT_COMPLETE');
        await audit(req, 'COURSE_MEDIA_ACTIVATED', row.id.value);
        res.json(status(row));
      }),
    );
    return router;
  }
}
