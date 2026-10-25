import type {CourseAdminScope, CourseAdminContext, CourseAdminCommandUseCases} from '@manaratak/application';
import { readReviewReasonHeader } from '@manaratak/shared';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  CourseAccessType,
  courseBlockTypes,
  CourseContentStatus,
  CourseImportCompletenessState,
  CourseLessonType,
  CourseOriginType,
  CourseQuestionType,
  CourseStatus,
  LessonAssetType,
  UpdateCourseDto
} from '@manaratak/domain';
import type { CourseProgressUseCases } from '@manaratak/application';
import type {} from '../../middleware/AuthMiddleware.js';
import { CourseMediaRouter, type CourseMediaCradle } from './CourseMediaRouter.js';

export class CourseAdminRouter {
  public static create(cradle: CourseAdminScope & CourseMediaCradle & {courseAdminCommandUseCases:CourseAdminCommandUseCases; courseProgressUseCases: CourseProgressUseCases}): Router {
    const router = Router();
    router.use('/:id/media', CourseMediaRouter.create(cradle));
    const {learningPathUseCases} = cradle;

    const mutationContext = (req: Request): CourseAdminContext => {
      if (!req.authUserId) throw new Error('AUTHENTICATED_ADMIN_ACTOR_REQUIRED');
      const reason = z.string().trim().min(3).max(2000).parse(readReviewReasonHeader(req.get('X-Review-Reason'), req.get('X-Review-Reason-Encoding')) ?? z.object({ reason: z.string().optional() }).strip().parse(req.body ?? {}).reason);
      const raw = req.get('If-Match');
      let expectedVersion: number | undefined;
      if (req.params.id || req.params.pathId) {
        const match = raw && /^(?:"(\d+)"|(\d+))$/.exec(raw);
        expectedVersion = match ? Number(match[1] ?? match[2]) : undefined;
        if (!Number.isSafeInteger(expectedVersion) || expectedVersion! < 1) throw new Error('COURSE_VERSION_PRECONDITION_REQUIRED');
      }
      return {actorId:req.authUserId,actorType:'IDENTITY',source:'admin-course-api',reason,expectedVersion,
        correlationId:req.get('X-Correlation-ID') ?? req.get('X-Request-ID')};
    };
    const asyncHandler = (fn: (req:Request,res:Response,scope:CourseAdminScope)=>Promise<unknown>) =>
      (req:Request,res:Response,next:NextFunction) => {
        const run = async () => {
          if (req.method === 'GET') return fn(req,res,cradle);
          const context=mutationContext(req);
          // Publication retains its dedicated domain event and atomic coordinator.
          if(req.params.id && req.route.path === '/:id/publish') {
            let body:unknown;
            const buffered:Response=new Proxy(res,{get(target,key){
              if(key==='json')return (value:unknown)=>{body=value;return buffered;};
              if(key==='status')return (code:number)=>{target.statusCode=code;return buffered;};
              const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
            }});
            await fn(req,buffered,cradle);
            const current=await cradle.adminCourseUseCases.getCourse(req.params.id);
            res.setHeader('X-Entity-Version',String(current.version));
            res.json(body);
            return;
          }
          const kind=req.route.path.startsWith('/learning-paths')?'LEARNING_PATH':'COURSE';
          const id=req.params.pathId ?? req.params.id;
          const commandName=req.route.path === '/:id/unpublish'?'COURSE_UNPUBLISH':
            req.route.path === '/:id/archive'?'COURSE_ARCHIVE':
            req.route.path === '/:id/duplicate'?'COURSE_DUPLICATE':
            `ADMIN_${req.method}_${req.route.path.replace(/[^a-zA-Z0-9]+/g,'_').toUpperCase()}`;
          // Buffer response bodies until the business/audit/outbox transaction commits.
          let responseBody: unknown;
          const responseState:{kind:'json'|'send'}={kind:'json'};
          const buffered: Response = new Proxy(res,{get(target,key){
            if(key==='json' || key==='send') return (body:unknown)=>{responseBody=body;responseState.kind=key;return buffered;};
            if(key==='status') return (code:number)=>{target.statusCode=code;return buffered;};
            const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
          }});
          const result=await cradle.courseAdminCommandUseCases.execute(kind,id,commandName,context,
            async scope=>{await fn(req,buffered,scope);return responseBody;});
          if(result.version!==undefined) res.setHeader('X-Entity-Version',String(result.version));
          if(responseState.kind==='send') res.send(responseBody);else res.json(responseBody);
        };
        run().catch(next);
      };

    const assessmentHandler = (fn: (req: Request, res: Response) => Promise<unknown>) =>
      (req: Request, res: Response, next: NextFunction) => { Promise.resolve().then(() => fn(req, res)).catch(next); };
    router.get('/:id/learning-report', assessmentHandler(async (req, res) => {
      const query = z.object({ cohortFrom: z.string().date().optional(), cohortTo: z.string().date().optional() }).strict().parse(req.query);
      if (query.cohortFrom && query.cohortTo && query.cohortFrom >= query.cohortTo) return res.status(400).json({ error: 'COURSE_COHORT_RANGE_INVALID' });
      res.json(await cradle.adminCourseUseCases.getNativeLearningReport(req.params.id, query));
    }));
    router.get('/:id/learners', assessmentHandler(async (req, res) => {
      const query = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20),
        status: z.enum(['PENDING','WAITLISTED','ACTIVE','COMPLETED','CANCELLED','SUSPENDED']).optional(), search: z.string().trim().max(100).optional(),
      }).strict().parse(req.query);
      res.json(await cradle.courseProgressUseCases.listCourseLearners(req.params.id, query));
    }));
    router.get('/:id/learners/:enrollmentId', assessmentHandler(async (req, res) => {
      const query = z.object({ lessonsPage: z.coerce.number().int().min(1).max(100000).default(1), attemptsPage: z.coerce.number().int().min(1).max(100000).default(1) }).strict().parse(req.query);
      const result = await cradle.courseProgressUseCases.getCourseLearnerReview(req.params.id, z.string().uuid().parse(req.params.enrollmentId), query);
      if (!result) return res.status(404).json({ error: 'COURSE_ENROLLMENT_NOT_FOUND' });
      res.json(result);
    }));
    router.get('/:id/assessment-reviews', assessmentHandler(async (req, res) => {
      const query = z.object({page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20)}).parse(req.query);
      res.json({data: await cradle.courseProgressUseCases.listPendingAssessments(req.params.id, query.page, query.pageSize)});
    }));
    router.post('/:id/assessment-reviews/:attemptId/grade', assessmentHandler(async (req, res) => {
      if (!req.authUserId) throw new Error('AUTHENTICATED_ADMIN_ACTOR_REQUIRED');
      const body = z.object({expectedSubmittedAt: z.string().datetime(), questionScores: z.record(z.string(), z.number().finite().nonnegative()),
        feedback: z.string().max(5000), reason: z.string().trim().min(3).max(2000)}).strict().parse(req.body);
      res.json(await cradle.courseProgressUseCases.gradeAssessment(req.params.id, req.params.attemptId, body,
        {actorId: req.authUserId, source: 'admin-course-assessment-api', correlationId: req.get('X-Correlation-ID')}));
    }));

    const listQuerySchema = z.object({
      status: z.preprocess(v => v === '' || v === 'all' ? undefined : v, z.nativeEnum(CourseStatus).optional()),
      completenessStatus: z.nativeEnum(CourseImportCompletenessState).optional(),
      accessType: z.nativeEnum(CourseAccessType).optional(),
      originType: z.nativeEnum(CourseOriginType).optional(),
      platformName: z.string().trim().max(200).optional(),
      search: z.string().trim().max(200).optional(),
      externalProviderId: z.string().trim().min(1).max(200).optional(),
      majorId: z.string().trim().min(1).max(200).optional(),
      category: z.string().trim().max(200).optional(),
      learningLanguage: z.string().trim().max(200).optional(),
      difficultyLevel: z.string().trim().max(200).optional(),
      isFreeCertificate: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
      studyAccess: z.enum(['FREE', 'PAID', 'UNKNOWN']).optional(),
      certificateState: z.enum(['FREE', 'NON_FREE', 'UNAVAILABLE', 'UNKNOWN']).optional(),
      linkHealth: z.enum(['VERIFIED', 'BROKEN', 'NEEDS_REVIEW', 'UNKNOWN']).optional(),
      cohortFrom: z.string().date().optional(),
      cohortTo: z.string().date().optional(),
      hasEnrollments: z.enum(['true', 'false']).transform(value => value === 'true').optional(),
      instructor: z.string().trim().max(200).optional(),
      sort: z.enum(['UPDATED_DESC', 'UPDATED_ASC', 'NAME_ASC', 'NAME_DESC', 'STATUS_ASC']).optional(),
      page: z.coerce.number().int().min(1).max(100000).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    });

    // Static, read-only catalog routes precede /:id. Scope is enforced here,
    // independently of the visual filters, using the existing Course repository.
    router.get('/catalog/options', asyncHandler(async (req, res, { adminCourseUseCases }) => {
      const query = z.object({ field: z.enum(['learningLanguage', 'difficultyLevel']), originType: z.nativeEnum(CourseOriginType).optional(),
        search: z.string().trim().max(200).optional(), page: z.coerce.number().int().min(1).max(1000).default(1) }).parse(req.query);
      res.json(await adminCourseUseCases.catalogOptions(query));
    }));
    for (const scope of ['all', 'native', 'external'] as const) {
      const path = scope === 'all' ? '/catalog' : `/catalog/${scope}`;
      router.get(path, asyncHandler(async (req, res, { adminCourseUseCases }) => {
        const filters = listQuerySchema.parse(req.query);
        if (scope === 'native' && (filters.externalProviderId || filters.platformName || filters.completenessStatus || filters.linkHealth)) {
          return res.status(400).json({ error: 'NATIVE_COURSE_EXTERNAL_FILTER_FORBIDDEN' });
        }
        if (scope !== 'all') filters.originType = scope === 'native' ? CourseOriginType.NATIVE_MANARATAK_COURSE : CourseOriginType.EXTERNAL_LINKED_COURSE;
        // A registry provider identifies external courses, never a native instructor.
        if (scope === 'all' && (filters.externalProviderId || filters.platformName || filters.completenessStatus || filters.linkHealth)) filters.originType = CourseOriginType.EXTERNAL_LINKED_COURSE;
        if ((filters.cohortFrom || filters.cohortTo || filters.instructor || filters.hasEnrollments !== undefined) && filters.originType !== CourseOriginType.NATIVE_MANARATAK_COURSE) return res.status(400).json({ error: 'NATIVE_COURSE_SCOPE_REQUIRED' });
        if (filters.cohortFrom && filters.cohortTo && filters.cohortFrom >= filters.cohortTo) return res.status(400).json({ error: 'COURSE_COHORT_RANGE_INVALID' });
        const result = await adminCourseUseCases.listCourses({ ...filters, includeStatistics: true });
        res.json({ ...result, data: result.data.map(course => ({
          id: course.id, publicId: course.publicId, displayName: course.displayName, originalSourceTitle: course.originalSourceTitle,
          originType: course.originType, accessType: course.accessType, status: course.status, completenessStatus: course.completenessStatus,
          providerDisplayName: course.providerDisplayName, providerName: course.providerName, platformName: course.platformName,
          learningLanguage: course.learningLanguage ?? course.learningLanguageRaw, studyDuration: course.studyDuration ?? course.studyDurationRaw, difficultyLevel: course.difficultyLevel ?? course.studyLevelRaw,
          isStudyFree: course.isStudyFree, isFreeCertificate: course.isFreeCertificate, certificateAvailable: course.certificateAvailable,
          certificateType: course.certificateType, category: course.category, relatedMajors: course.relatedMajors,
          instructor: typeof course.optionalFields?.instructor === 'string' ? course.optionalFields.instructor : undefined,
          updatedAt: course.updatedAt, version: course.version,
        })) });
      }));
    }

    router.post('/:id/localized-description',asyncHandler(async(req,res,{adminCourseUseCases})=>{
      res.json(await adminCourseUseCases.saveLocalizedDescription(req.params.id,z.object({locale:z.enum(['ar','en']),displayName:z.string().trim().min(1).max(500).optional(),description:z.string().trim().min(1).max(100000).optional(),remove:z.boolean().optional()}).strict().parse(req.body)));
    }));

    const updateBodySchema = z.object({
      displayName: z.string().optional(),
      accessType: z.nativeEnum(CourseAccessType).optional(),
      originType: z.nativeEnum(CourseOriginType).optional(),
      directCourseUrl: z.string().refine((value) => value.startsWith('/') || z.string().url().safeParse(value).success, 'Must be an internal path or absolute URL').optional(),
      platformName: z.string().nullable().optional(),
      providerName: z.string().nullable().optional(),
      learningLanguage: z.string().nullable().optional(),
      studyDuration: z.string().nullable().optional(),
      certificateAvailable: z.boolean().nullable().optional(),
      category: z.string().nullable().optional(),
      difficultyLevel: z.string().nullable().optional(),
      sourceUrl: z.union([z.string().url(), z.literal('')]).nullable().optional(),
      officialSourceUrl: z.union([z.string().url(), z.literal('')]).nullable().optional(),
      thumbnailAssetId: z.string().refine((value) => !/^https?:\/\//i.test(value), 'thumbnailAssetId must be an EAP handle').nullable().optional(),
      courseContent: z.string().optional(),
      description: z.string().optional(),
      titleEn: z.string().optional(),
      instructor: z.string().optional(),
      prerequisites: z.array(z.string()).optional(),
      targetAudience: z.array(z.string()).optional(),
      learningOutcomes: z.array(z.string()).optional(),
      promotionalVideoAssetId: z.string().refine((value) => !/^https?:\/\//i.test(value), 'promotionalVideoAssetId must be an EAP handle').optional(),
      completionCriteria: z.record(z.string(), z.unknown()).optional(),
      relatedMajorsOrFields: z.union([z.string(), z.array(z.string())]).optional(),
      acquiredSkills: z.array(z.string()).optional(),
      localizedNames: z.record(z.string(), z.string()).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });

    const moduleBodySchema = z.object({
      title: z.string().min(1),
      description: z.string().nullable().optional(),
      position: z.number().int().positive(),
      status: z.nativeEnum(CourseContentStatus).optional(),
    });

    const modulePatchSchema = moduleBodySchema.partial();

    const lessonBodySchema = z.object({
      title: z.string().min(1),
      summary: z.string().nullable().optional(),
      lessonType: z.nativeEnum(CourseLessonType),
      position: z.number().int().positive(),
      estimatedDurationMinutes: z.number().int().positive().nullable().optional(),
      contentText: z.string().nullable().optional(),
      status: z.nativeEnum(CourseContentStatus).optional(),
    });

    const lessonPatchSchema = lessonBodySchema.partial();

    const lessonAssetBodySchema = z.object({
      assetId: z.string().min(1).refine((value) => !/^https?:\/\//i.test(value), 'assetId must be a Phase 05 EAP handle, not a raw URL'),
      assetReference: z.string().min(1).refine((value) => !/^https?:\/\//i.test(value), 'assetReference must be a Phase 05 EAP handle, not a raw URL').nullable().optional(),
      title: z.string().nullable().optional(),
      assetType: z.nativeEnum(LessonAssetType),
      position: z.number().int().positive(),
      isRequired: z.boolean().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });

    const quizBodySchema = z.object({
      assessmentType: z.enum(['QUIZ', 'ASSIGNMENT']).optional(),
      moduleId: z.string().nullable().optional(),
      lessonId: z.string().nullable().optional(),
      title: z.string().min(1),
      instructions: z.string().nullable().optional(),
      position: z.number().int().positive(),
      passingScore: z.number().int().min(0).max(100).nullable().optional(),
      maxAttempts: z.number().int().positive().nullable().optional(),
      status: z.nativeEnum(CourseContentStatus).optional(),
    });

    const questionBankBodySchema = z.object({
      title: z.string().min(1),
      description: z.string().nullable().optional(),
      status: z.nativeEnum(CourseContentStatus).optional(),
    });

    const questionBodySchema = z.object({
      quizId: z.string().optional(),
      questionBankId: z.string().optional(),
      questionType: z.nativeEnum(CourseQuestionType),
      prompt: z.string().min(1),
      choices: z.unknown().optional(),
      correctAnswer: z.unknown().optional(),
      explanation: z.string().nullable().optional(),
      points: z.number().int().positive().optional(),
      position: z.number().int().positive(),
      status: z.nativeEnum(CourseContentStatus).optional(),
    });

    const nativeCreateBodySchema = z.object({
      titleAr: z.string().trim().min(2),
      accessType: z.nativeEnum(CourseAccessType).optional(),
      titleEn: z.string().trim().optional(),
      learningLanguage: z.string().trim().optional(),
      category: z.string().trim().optional(),
      difficultyLevel: z.string().trim().optional(),
    });

    const enrollmentPolicySchema = z.object({
      isCapacityLimited: z.boolean().optional(),
      maximumSeats: z.number().int().positive().nullable().optional(),
      requiresApproval: z.boolean().optional(),
      waitlistEnabled: z.boolean().optional(),
      prerequisiteCourseIds: z.array(z.string().min(1)).optional(),
      eligibilityRules: z.record(z.string(), z.unknown()).nullable().optional(),
      requiresFinancialClearance: z.boolean().optional(),
    });
    const learningPathSchema = z.object({
      certificateEligible: z.boolean().optional(),
      title: z.string().trim().min(1),
      description: z.string().nullable().optional(),
      slug: z.string().trim().min(1).optional(),
      isStrictlyOrdered: z.boolean().optional(),
      completionLogic: z.enum(['ALL_REQUIRED', 'ALL']).optional(),
      courses: z.array(z.object({
        courseId: z.string().min(1), position: z.number().int().positive(), required: z.boolean(),
        prerequisiteCourseIds: z.array(z.string().min(1)).default([]),
      })).max(100).default([]),
    }).strict();

    const taxonomyRelationshipBodySchema = z.object({
      taxonomyNodeId: z.string().trim().min(1),
      relationshipType: z.enum(['PRIMARY', 'SECONDARY', 'RELATED']).default('PRIMARY'),
    });
    const majorRelationshipBodySchema = z.object({
      majorId: z.string().trim().min(1),
      relationshipType: z.enum(['PRIMARY', 'SECONDARY', 'RELATED']).default('PRIMARY'),
    });
    const testRelationshipBodySchema = z.object({
      internationalTestId: z.string().trim().min(1),
      relationshipType: z.enum(['PREPARATION', 'PRACTICE', 'EXAM_READINESS', 'RELATED']),
    });

    const reorderBodySchema = z.object({
      positions: z.array(z.object({ id: z.string().min(1), position: z.number().int().positive() })).min(1)
    });

    router.post('/', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {nativeCourseUseCases}=scope;
      const course = await nativeCourseUseCases.create(nativeCreateBodySchema.parse(req.body));
      res.status(201).json(course);
    }));

    const copyOptionsSchema = z.object({ includeAssets: z.boolean(), acknowledgeAssetRights: z.boolean() }).strict();
    router.post('/:id/duplicate', asyncHandler(async (req, res, scope) => {
      const input = copyOptionsSchema.extend({ titleAr: z.string().trim().min(2).max(500) }).strict().parse(req.body);
      res.status(201).json(await scope.nativeCourseUseCases.duplicate(req.params.id, input));
    }));
    router.post('/:id/modules/:moduleId/duplicate', asyncHandler(async (req, res, scope) => {
      res.status(201).json(await scope.courseCurriculumUseCases.duplicateContent(req.params.id, { ...copyOptionsSchema.parse(req.body), moduleId: req.params.moduleId }));
    }));
    router.post('/:id/lessons/:lessonId/duplicate', asyncHandler(async (req, res, scope) => {
      res.status(201).json(await scope.courseCurriculumUseCases.duplicateContent(req.params.id, { ...copyOptionsSchema.parse(req.body), lessonId: req.params.lessonId }));
    }));
    router.post('/:id/lessons/:lessonId/convert-text', asyncHandler(async (req, res, scope) => {
      z.object({}).strict().parse(req.body);
      res.json(await scope.courseCurriculumUseCases.convertLegacyLessonText(req.params.id, req.params.lessonId));
    }));

    router.get('/', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {adminCourseUseCases}=scope;
      const filters = listQuerySchema.parse(req.query);
      const result = await adminCourseUseCases.listCourses(filters);
      res.json(result);
    }));

    router.get('/learning-paths', asyncHandler(async (req: Request, res: Response) => {
      const query=z.object({page:z.coerce.number().int().min(1).max(1000).default(1),pageSize:z.coerce.number().int().min(1).max(50).default(20)}).strict().parse(req.query);
      res.json({ data: await learningPathUseCases.list(query) });
    }));
    router.post('/learning-paths', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {learningPathUseCases}=scope;
      res.status(201).json(await learningPathUseCases.create(learningPathSchema.parse(req.body)));
    }));
    router.get('/learning-paths/:pathId', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {learningPathUseCases}=scope;
      const path=await learningPathUseCases.get(req.params.pathId);
      res.setHeader('ETag', `"${path.version}"`);
      res.json(path);
    }));
    router.patch('/learning-paths/:pathId',asyncHandler(async(req:Request,res:Response,scope:CourseAdminScope)=>{
      const input=learningPathSchema.omit({slug:true}).extend({courses:learningPathSchema.shape.courses.removeDefault().optional()}).parse(req.body);
      res.json(await scope.learningPathUseCases.updateDraft(req.params.pathId,input));
    }));
    router.post('/learning-paths/:pathId/mark-publishable', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {learningPathUseCases}=scope;
      res.json(await learningPathUseCases.markReadyToPublish(req.params.pathId));
    }));
    router.post('/learning-paths/:pathId/publish', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {learningPathUseCases}=scope;
      res.json(await learningPathUseCases.publish(req.params.pathId));
    }));
    router.post('/learning-paths/:pathId/archive', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {learningPathUseCases}=scope;
      res.json(await learningPathUseCases.archive(req.params.pathId));
    }));

    router.get('/:id', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {adminCourseUseCases}=scope;
      const course = await adminCourseUseCases.getCourse(req.params.id);
      res.setHeader('ETag', `"${course.version}"`);
      res.json(course);
    }));

    router.get('/:id/curriculum', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      const snapshot = await courseCurriculumUseCases.getCurriculumSnapshot(req.params.id);
      res.json(snapshot);
    }));

    router.get('/:id/relationships', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseRelationshipResolutionService}=scope;
      res.json(await courseRelationshipResolutionService.getReviewModel(req.params.id));
    }));

    router.post('/:id/relationships/analyze', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseRelationshipResolutionService}=scope;
      res.json(await courseRelationshipResolutionService.analyzeCourse(req.params.id));
    }));

    router.post('/:id/relationships/taxonomy', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseRelationshipResolutionService}=scope;
      const body = taxonomyRelationshipBodySchema.parse(req.body);
      res.status(201).json(await courseRelationshipResolutionService.proposeManualTaxonomyLink(
        req.params.id, body.taxonomyNodeId, body.relationshipType, mutationContext(req).actorId,
      ));
    }));

    router.post('/:id/relationships/taxonomy/:linkId/approve', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseRelationshipResolutionService}=scope;
      res.json(await courseRelationshipResolutionService.approveTaxonomyLink(req.params.id, req.params.linkId, mutationContext(req).actorId));
    }));

    router.post('/:id/relationships/taxonomy/:linkId/reject', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseRelationshipResolutionService}=scope;
      res.json(await courseRelationshipResolutionService.rejectTaxonomyLink(req.params.id, req.params.linkId, mutationContext(req).actorId));
    }));

    router.post('/:id/relationships/language', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseRelationshipResolutionService}=scope;
      const body = z.object({ languageReferenceId: z.string().trim().min(1) }).parse(req.body);
      await courseRelationshipResolutionService.approveLanguageReference(req.params.id, body.languageReferenceId, mutationContext(req).actorId);
      res.json(await courseRelationshipResolutionService.getReviewModel(req.params.id));
    }));

    router.post('/:id/relationships/majors/project', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseRelationshipResolutionService}=scope;
      res.json({ data: await courseRelationshipResolutionService.projectMajors(req.params.id) });
    }));

    router.post('/:id/relationships/majors', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseRelationshipResolutionService}=scope;
      const body = majorRelationshipBodySchema.parse(req.body);
      res.status(201).json(await courseRelationshipResolutionService.proposeDirectMajorProjection(
        req.params.id, body.majorId, body.relationshipType, mutationContext(req).actorId,
      ));
    }));

    router.post('/:id/relationships/majors/:projectionId/approve', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseRelationshipResolutionService}=scope;
      res.json(await courseRelationshipResolutionService.approveMajorProjection(req.params.id, req.params.projectionId, mutationContext(req).actorId));
    }));

    router.post('/:id/relationships/majors/:projectionId/reject', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseRelationshipResolutionService}=scope;
      res.json(await courseRelationshipResolutionService.rejectMajorProjection(req.params.id, req.params.projectionId, mutationContext(req).actorId));
    }));

    router.post('/:id/relationships/tests', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseRelationshipResolutionService}=scope;
      const body = testRelationshipBodySchema.parse(req.body);
      res.status(201).json(await courseRelationshipResolutionService.proposeInternationalTestRelationship(
        req.params.id, body.internationalTestId, body.relationshipType, mutationContext(req).actorId,
      ));
    }));

    router.post('/:id/relationships/tests/:relationshipId/approve', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseRelationshipResolutionService}=scope;
      res.json(await courseRelationshipResolutionService.approveInternationalTestRelationship(
        req.params.id, req.params.relationshipId, mutationContext(req).actorId,
      ));
    }));

    router.post('/:id/relationships/tests/:relationshipId/reject', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseRelationshipResolutionService}=scope;
      res.json(await courseRelationshipResolutionService.rejectInternationalTestRelationship(
        req.params.id, req.params.relationshipId, mutationContext(req).actorId,
      ));
    }));

    router.get('/:id/enrollment-policy', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseEnrollmentPolicyUseCases}=scope;
      res.json(await courseEnrollmentPolicyUseCases.get(req.params.id));
    }));
    router.put('/:id/enrollment-policy', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseEnrollmentPolicyUseCases}=scope;
      res.json(await courseEnrollmentPolicyUseCases.configure({ courseId: req.params.id, ...enrollmentPolicySchema.parse(req.body) }));
    }));

    router.get('/:id/readiness', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {nativeCourseUseCases}=scope;
      res.json(await nativeCourseUseCases.getReadiness(req.params.id));
    }));

    router.put('/:id/lessons/:lessonId/content-blocks', asyncHandler(async (req, res, scope) => {
      const body = z.object({ blocks: z.array(z.object({ id: z.string().uuid(), type: z.enum(courseBlockTypes), payload: z.record(z.string(), z.unknown()),
        assetReferenceId: z.string().uuid().nullable().optional(), quizId: z.string().uuid().nullable().optional(),
      }).strict()).max(200) }).strict().parse(req.body);
      res.json({ data: await scope.courseCurriculumUseCases.replaceLessonBlocks(req.params.id, req.params.lessonId, body.blocks) });
    }));
    router.get('/:id/modules', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      const modules = await courseCurriculumUseCases.listModules(req.params.id);
      res.json({ data: modules });
    }));

    router.post('/:id/modules', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      const body = moduleBodySchema.parse(req.body);
      const module = await courseCurriculumUseCases.createModule({
        courseId: req.params.id,
        title: body.title,
        description: body.description ?? undefined,
        position: body.position,
        status: body.status,
      });
      res.status(201).json(module);
    }));

    router.patch('/:id/modules/:moduleId', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      const body = modulePatchSchema.parse(req.body);
      const module = await courseCurriculumUseCases.updateModule(req.params.id, req.params.moduleId, body);
      res.json(module);
    }));

    router.delete('/:id/modules/:moduleId', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      await courseCurriculumUseCases.deleteModule(req.params.id, req.params.moduleId);
      res.status(204).send();
    }));

    router.put('/:id/modules/reorder', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      await courseCurriculumUseCases.reorderModules(req.params.id, reorderBodySchema.parse(req.body).positions);
      res.json({ success: true });
    }));

    router.get('/:id/modules/:moduleId/lessons', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      const lessons = await courseCurriculumUseCases.listLessons(req.params.id, req.params.moduleId);
      res.json({ data: lessons });
    }));

    router.post('/:id/modules/:moduleId/lessons', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      const body = lessonBodySchema.parse(req.body);
      const lesson = await courseCurriculumUseCases.createLesson({
        courseId: req.params.id,
        moduleId: req.params.moduleId,
        title: body.title,
        summary: body.summary ?? undefined,
        lessonType: body.lessonType,
        position: body.position,
        estimatedDurationMinutes: body.estimatedDurationMinutes ?? undefined,
        contentText: body.contentText ?? undefined,
        status: body.status,
      });
      res.status(201).json(lesson);
    }));

    router.patch('/:id/lessons/:lessonId', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      const body = lessonPatchSchema.parse(req.body);
      const lesson = await courseCurriculumUseCases.updateLesson(req.params.id, req.params.lessonId, body);
      res.json(lesson);
    }));

    router.delete('/:id/lessons/:lessonId', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      await courseCurriculumUseCases.deleteLesson(req.params.id, req.params.lessonId);
      res.status(204).send();
    }));

    router.put('/:id/modules/:moduleId/lessons/reorder', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      await courseCurriculumUseCases.reorderLessons(req.params.id, req.params.moduleId, reorderBodySchema.parse(req.body).positions);
      res.json({ success: true });
    }));

    router.get('/:id/lessons/:lessonId/assets', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      const assets = await courseCurriculumUseCases.listLessonAssets(req.params.id, req.params.lessonId);
      res.json({ data: assets });
    }));

    router.post('/:id/lessons/:lessonId/assets', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      const body = lessonAssetBodySchema.parse(req.body);
      const asset = await courseCurriculumUseCases.attachAssetToLesson(req.params.id, {
        lessonId: req.params.lessonId,
        assetId: body.assetId,
        assetReference: body.assetReference ?? undefined,
        title: body.title ?? undefined,
        assetType: body.assetType,
        position: body.position,
        isRequired: body.isRequired,
        metadata: body.metadata,
      });
      res.status(201).json(asset);
    }));

    router.delete('/:id/lessons/:lessonId/assets/:assetId', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      await courseCurriculumUseCases.detachAssetFromLesson(req.params.id, req.params.assetId);
      res.status(204).send();
    }));

    router.get('/:id/quizzes', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      const quizzes = await courseCurriculumUseCases.listQuizzes(req.params.id);
      res.json({ data: quizzes });
    }));

    router.post('/:id/quizzes', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      const body = quizBodySchema.parse(req.body);
      const quiz = await courseCurriculumUseCases.createQuiz({
        courseId: req.params.id,
        moduleId: body.moduleId ?? undefined,
        lessonId: body.lessonId ?? undefined,
        title: body.title,
        instructions: body.instructions ?? undefined,
        position: body.position,
        passingScore: body.passingScore,
        maxAttempts: body.maxAttempts,
        assessmentType: body.assessmentType,
        status: body.status,
      });
      res.status(201).json(quiz);
    }));

    router.patch('/:id/quizzes/:quizId', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      res.json(await courseCurriculumUseCases.updateQuiz(req.params.id, req.params.quizId, quizBodySchema.partial().parse(req.body)));
    }));

    router.delete('/:id/quizzes/:quizId', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      await courseCurriculumUseCases.deleteQuiz(req.params.id, req.params.quizId);
      res.status(204).send();
    }));

    router.post('/:id/question-banks', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      const body = questionBankBodySchema.parse(req.body);
      const questionBank = await courseCurriculumUseCases.createQuestionBank({
        courseId: req.params.id,
        title: body.title,
        description: body.description ?? undefined,
        status: body.status,
      });
      res.status(201).json(questionBank);
    }));

    router.patch('/:id/question-banks/:bankId', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      res.json(await courseCurriculumUseCases.updateQuestionBank(req.params.id, req.params.bankId, questionBankBodySchema.partial().parse(req.body)));
    }));

    router.delete('/:id/question-banks/:bankId', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      await courseCurriculumUseCases.deleteQuestionBank(req.params.id, req.params.bankId);
      res.status(204).send();
    }));

    router.get('/:id/quizzes/:quizId/questions', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      const questions = await courseCurriculumUseCases.listQuizQuestions(req.params.id, req.params.quizId);
      res.json({ data: questions });
    }));

    router.post('/:id/questions', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      const body = questionBodySchema.parse(req.body);
      const question = await courseCurriculumUseCases.createQuestion({
        courseId: req.params.id,
        quizId: body.quizId,
        questionBankId: body.questionBankId,
        questionType: body.questionType,
        prompt: body.prompt,
        choices: body.choices as any,
        correctAnswer: body.correctAnswer as any,
        explanation: body.explanation ?? undefined,
        points: body.points,
        position: body.position,
        status: body.status,
      });
      res.status(201).json(question);
    }));

    router.patch('/:id/questions/:questionId', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      res.json(await courseCurriculumUseCases.updateQuestion(req.params.id, req.params.questionId, questionBodySchema.partial().parse(req.body) as any));
    }));

    router.delete('/:id/questions/:questionId', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {courseCurriculumUseCases}=scope;
      await courseCurriculumUseCases.deleteQuestion(req.params.id, req.params.questionId);
      res.status(204).send();
    }));

    router.patch('/:id', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {adminCourseUseCases}=scope;
      const updates = updateBodySchema.parse(req.body);

      const optionalFields: Record<string, unknown> = {};
      if (updates.courseContent !== undefined) optionalFields.courseContent = updates.courseContent;
      if (updates.description !== undefined) optionalFields.description = updates.description;
      if (updates.titleEn !== undefined) optionalFields.titleEn = updates.titleEn;
      if (updates.instructor !== undefined) optionalFields.instructor = updates.instructor;
      if (updates.prerequisites !== undefined) optionalFields.prerequisites = updates.prerequisites;
      if (updates.targetAudience !== undefined) optionalFields.targetAudience = updates.targetAudience;
      if (updates.learningOutcomes !== undefined) optionalFields.learningOutcomes = updates.learningOutcomes;
      if (updates.promotionalVideoAssetId !== undefined) optionalFields.promotionalVideoAssetId = updates.promotionalVideoAssetId;
      if (updates.completionCriteria !== undefined) optionalFields.completionCriteria = updates.completionCriteria;
      if (updates.relatedMajorsOrFields !== undefined) optionalFields.relatedMajorsOrFields = updates.relatedMajorsOrFields;
      if (updates.acquiredSkills !== undefined) optionalFields.acquiredSkills = updates.acquiredSkills;
      if (updates.localizedNames !== undefined) optionalFields.localizedNames = updates.localizedNames;
      if (updates.metadata !== undefined) optionalFields.metadata = updates.metadata;

      const dataToUpdate: UpdateCourseDto = {
        displayName: updates.displayName,
        accessType: updates.accessType,
        originType: updates.originType,
        directCourseUrl: updates.directCourseUrl,
        platformName: updates.platformName,
        providerName: updates.providerName,
        learningLanguage: updates.learningLanguage,
        studyDuration: updates.studyDuration,
        certificateAvailable: updates.certificateAvailable,
        category: updates.category,
        difficultyLevel: updates.difficultyLevel,
        sourceUrl: updates.sourceUrl === '' ? null : updates.sourceUrl,
        officialSourceUrl: updates.officialSourceUrl === '' ? null : updates.officialSourceUrl,
        thumbnailAssetId: updates.thumbnailAssetId,
      };

      if (Object.keys(optionalFields).length > 0) {
        dataToUpdate.optionalFields = optionalFields;
      }

      const course = await adminCourseUseCases.updateCourse(req.params.id, dataToUpdate);
      res.json(course);
    }));

    router.post('/:id/mark-ready', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {adminCourseUseCases, nativeCourseUseCases}=scope;
      const course = await adminCourseUseCases.getCourse(req.params.id);
      if (course.originType === CourseOriginType.NATIVE_MANARATAK_COURSE) await nativeCourseUseCases.markReadyToReview(req.params.id);
      else await adminCourseUseCases.markReadyToReview(req.params.id);
      res.status(200).json({ success: true });
    }));

    router.post('/:id/mark-publishable', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {adminCourseUseCases, nativeCourseUseCases}=scope;
      const course = await adminCourseUseCases.getCourse(req.params.id);
      if (course.originType === CourseOriginType.NATIVE_MANARATAK_COURSE) await nativeCourseUseCases.markReadyToPublish(req.params.id);
      else await adminCourseUseCases.markReadyToPublish(req.params.id);
      res.status(200).json({ success: true });
    }));

    router.post('/:id/publish', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {adminCourseUseCases, nativeCourseUseCases}=scope;
      const course = await adminCourseUseCases.getCourse(req.params.id);
      if (course.originType === CourseOriginType.NATIVE_MANARATAK_COURSE) await nativeCourseUseCases.publish(req.params.id, mutationContext(req));
      else await adminCourseUseCases.publish(req.params.id, mutationContext(req));
      res.status(200).json({ success: true });
    }));

    router.post('/:id/unpublish', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {adminCourseUseCases}=scope;
      await adminCourseUseCases.unpublish(req.params.id);
      res.status(200).json({ success: true });
    }));

    router.post('/:id/reject', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {adminCourseUseCases}=scope;
      await adminCourseUseCases.reject(req.params.id);
      res.status(200).json({ success: true });
    }));

    router.post('/:id/archive', asyncHandler(async (req: Request, res: Response, scope: CourseAdminScope) => {
      const {adminCourseUseCases}=scope;
      await adminCourseUseCases.archive(req.params.id);
      res.status(200).json({ success: true });
    }));

    router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      if (['COURSE_STALE_VERSION','LEARNING_PATH_STALE_VERSION','COURSE_PUBLICATION_STATE_CHANGED','COURSE_ASSESSMENT_REVIEW_CONFLICT','COURSE_ASSESSMENT_NOT_PENDING'].includes(err.message)) return res.status(409).json({error:err.message});
      if (err.message === 'COURSE_VERSION_PRECONDITION_REQUIRED') return res.status(428).json({error:err.message});
      const translationCode=err instanceof Error?err.message:'';
      if(translationCode.startsWith('TRANSLATION_CONTENT_AUTHORING_DISABLED')) return res.status(403).json({error:'TRANSLATION_CONTENT_AUTHORING_DISABLED'});
      if(translationCode==='TRANSLATION_SOURCE_CHANGED_REVIEW_REQUIRED') return res.status(409).json({error:translationCode});
      if(translationCode.startsWith('TRANSLATION_')) return res.status(422).json({error:translationCode});
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation Error', details: err.issues });
      }
      if(typeof err.message==='string' && /^(COURSE_|NATIVE_COURSE_|LEARNING_PATH_|IMPORTED_COURSE_|AUTHENTICATED_ADMIN_)/.test(err.message)) return res.status(400).json({error:err.message});
      res.status(500).json({error:'COURSE_OPERATION_FAILED'});
    });

    return router;
  }
}
