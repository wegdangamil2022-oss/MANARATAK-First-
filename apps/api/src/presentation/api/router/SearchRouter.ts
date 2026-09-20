import { Router } from 'express';
import { ManageSearchUseCase, type IPublicSearchGateway } from '@manaratak/application';
import { z } from 'zod';

const searchScalar = z.union([z.string().max(500), z.number().finite(), z.boolean(), z.null()]);
const searchRequestSchema = z
  .object({
    scope: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-zA-Z0-9:_-]+$/),
    criteria: z
      .object({
        query: z.string().trim().max(200).optional(),
        filters: z
          .array(
            z
              .object({
                field: z
                  .string()
                  .trim()
                  .min(1)
                  .max(80)
                  .regex(/^[a-zA-Z0-9._-]+$/),
                operator: z
                  .string()
                  .trim()
                  .min(1)
                  .max(40)
                  .regex(/^[A-Z_]+$/),
                value: z.union([searchScalar, z.array(searchScalar).max(50)]),
              })
              .strict(),
          )
          .max(20)
          .optional(),
        logicalOperator: z.enum(['AND', 'OR']).optional(),
      })
      .strict(),
    pagination: z
      .object({
        page: z.coerce.number().int().min(1).max(10_000),
        limit: z.coerce.number().int().min(1).max(100),
      })
      .strict(),
    sorting: z
      .object({
        field: z
          .string()
          .trim()
          .min(1)
          .max(80)
          .regex(/^[a-zA-Z0-9._-]+$/),
        direction: z.enum(['ASC', 'DESC']),
      })
      .strict()
      .optional(),
  })
  .strict();

const publicKinds = z.enum([
  'scholarships',
  'universities',
  'majors',
  'countries',
  'courses',
  'exams',
  'articles',
  'services',
  'tools',
  'jobs',
]);
const publicSearchSchema = z
  .object({
    q: z.string().trim().min(1).max(160),
    locale: z.enum(['ar', 'en']).default('ar'),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().trim().min(1).max(2048).optional(),
    kinds: z.preprocess(
      (value) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value),
      z.array(publicKinds).max(10).optional(),
    ),
  })
  .strict();

export class SearchRouter {
  public static create({
    manageSearchUseCase,
    searchEngineGateway,
  }: {
    manageSearchUseCase: ManageSearchUseCase;
    searchEngineGateway: IPublicSearchGateway;
  }): Router {
    const router = Router();

    // Canonical public global search. Unlike the legacy request API, this contract is
    // cursor/keyset-paginated and queries owner persistence rather than a preloaded UI subset.
    router.get('/public', async (req, res, next) => {
      try {
        const input = publicSearchSchema.parse(req.query);
        if (typeof searchEngineGateway.searchPublic !== 'function')
          throw new Error('PUBLIC_SEARCH_ENGINE_UNAVAILABLE');
        const { q, ...options } = input;
        const page = await searchEngineGateway.searchPublic({ ...options, query: q });
        res.status(200).json({
          items: page.items.map((match) => ({
            target: match.target,
            score: match.score,
            ...match.payload,
          })),
          hasMore: page.hasMore,
          nextCursor: page.nextCursor,
        });
      } catch (error: unknown) {
        if (error instanceof z.ZodError)
          return res.status(400).json({ code: 'SEARCH_REQUEST_INVALID', issues: error.issues });
        if (error instanceof Error && error.message === 'SEARCH_CURSOR_INVALID')
          return res.status(400).json({ code: 'SEARCH_CURSOR_INVALID' });
        next(error);
      }
    });

    // Foundation search execution remains available for internal callers/history. Public
    // catalogs must use GET /public so offset/page pagination cannot silently truncate them.
    router.post('/', async (req, res, next) => {
      try {
        const dto = searchRequestSchema.parse(req.body);
        const { request, result } = await manageSearchUseCase.executeSearch({
          scope: dto.scope,
          criteria: {
            query: dto.criteria.query,
            filters: dto.criteria.filters,
            logicalOperator: dto.criteria.logicalOperator,
          },
          pagination: { page: Number(dto.pagination.page), limit: Number(dto.pagination.limit) },
          sorting: dto.sorting
            ? { field: dto.sorting.field, direction: dto.sorting.direction }
            : undefined,
        });

        res.status(200).json({
          requestId: request.getId().getValue(),
          reference: request.getReference().getValue(),
          matches: result.matches,
          totalCount: result.getTotalCount(),
          executionTimeMs: result.getExecutionTimeMs(),
        });
      } catch (error: unknown) {
        if (error instanceof z.ZodError)
          return res.status(400).json({ code: 'SEARCH_REQUEST_INVALID', issues: error.issues });
        next(error);
      }
    });

    router.get('/history/:reference', async (req, res, next) => {
      try {
        const reference = z
          .string()
          .trim()
          .min(1)
          .max(120)
          .regex(/^[a-zA-Z0-9_-]+$/)
          .parse(req.params.reference);
        const results = await manageSearchUseCase.getSearchRequestHistory(reference);
        res.status(200).json(
          results.map((request) => ({
            id: request.getId().getValue(),
            reference: request.getReference().getValue(),
            scope: request.getScope().getValue(),
            criteria: {
              query: request.getCriteria().query,
              filters: request.getCriteria().filters,
              logicalOperator: request.getCriteria().logicalOperator,
            },
            pagination: {
              page: request.getPagination().page,
              limit: request.getPagination().limit,
            },
            sorting: request.getSorting()
              ? { field: request.getSorting()?.field, direction: request.getSorting()?.direction }
              : undefined,
            timestamp: request.getTimestamp().toISOString(),
            isCompleted: request.getIsCompleted(),
            isExpired: request.getIsExpired(),
          })),
        );
      } catch (error: unknown) {
        if (error instanceof z.ZodError)
          return res.status(400).json({ code: 'SEARCH_REFERENCE_INVALID' });
        next(error);
      }
    });

    return router;
  }
}
