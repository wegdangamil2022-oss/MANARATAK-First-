import { PrismaClient } from '@prisma/client';
import {
  DomainSpecification,
  FilterComparison,
  ISearchRequestRepository,
  LogicalOperator,
  SearchCriteria,
  SearchFilter,
  SearchPagination,
  SearchReference,
  SearchRequest,
  SearchRequestId,
  SearchRequestState,
  SearchScope,
  SearchSorting,
  SortDirection,
} from '@manaratak/domain';

export class PrismaSearchRequestRepository implements ISearchRequestRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async save(request: SearchRequest): Promise<void> {
    const completion = request.getCompletion();
    await this.prisma.apiSearchRequestRecord.upsert({
      where: { id: request.getId().getValue() },
      create: {
        id: request.getId().getValue(),
        reference: request.getReference().getValue(),
        scope: request.scope.getValue(),
        query: request.criteria.query,
        filters: request.criteria.filters as unknown as object[],
        logicalOperator: request.criteria.logicalOperator,
        page: request.pagination.page,
        limit: request.pagination.limit,
        sortField: request.sorting?.field,
        sortDirection: request.sorting?.direction,
        state: request.getState(),
        totalCount: completion.totalCount,
        executionTimeMs: completion.executionTimeMs,
        createdAt: request.getTimestamp(),
      },
      update: {
        state: request.getState(),
        totalCount: completion.totalCount,
        executionTimeMs: completion.executionTimeMs,
      },
    });
  }

  public async findBy(specification: DomainSpecification<SearchRequest>): Promise<SearchRequest[]> {
    const rows = await this.prisma.apiSearchRequestRecord.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    return rows.map((row) => {
      const filters = Array.isArray(row.filters) ? row.filters : [];
      const request = SearchRequest.restore({
        id: SearchRequestId.create(row.id),
        reference: SearchReference.create(row.reference),
        scope: SearchScope.create(row.scope),
        criteria: SearchCriteria.create(
          row.query ?? '',
          filters.flatMap((raw: any) => {
            const operator = FilterComparison[String(raw?.operator) as keyof typeof FilterComparison];
            return raw?.field && operator ? [SearchFilter.create(String(raw.field), operator, raw.value)] : [];
          }),
          LogicalOperator[row.logicalOperator as keyof typeof LogicalOperator] ?? LogicalOperator.AND,
        ),
        pagination: SearchPagination.create(row.page, row.limit),
        sorting: row.sortField && row.sortDirection
          ? SearchSorting.create(row.sortField, SortDirection[row.sortDirection as keyof typeof SortDirection] ?? SortDirection.ASC)
          : undefined,
        state: row.state === SearchRequestState.COMPLETED ? SearchRequestState.COMPLETED : SearchRequestState.PENDING,
        totalCount: row.totalCount ?? undefined,
        executionTimeMs: row.executionTimeMs ?? undefined,
        createdAt: row.createdAt,
      });
      return request;
    }).filter((request) => specification.isSatisfiedBy(request));
  }
}
