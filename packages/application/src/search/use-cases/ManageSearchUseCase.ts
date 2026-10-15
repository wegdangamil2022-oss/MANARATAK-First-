import { randomUUID } from 'crypto';
import {
  SearchRequest,
  SearchResult,
  SearchRequestId,
  SearchReference,
  SearchScope,
  SearchCriteria,
  SearchFilter,
  SearchPagination,
  SearchSorting,
  FilterComparison,
  LogicalOperator,
  SortDirection,
  ISearchRequestRepository,
  SearchRequestSpecification
} from '@manaratak/domain';
import { SearchRequestDto } from '../dtos/SearchDtos';
import { ISearchEngineGateway } from '../gateways/ISearchEngineGateway';

// The legacy HTTP execution endpoint is limited to the same published catalog as
// its gateway; arbitrary caller-supplied owner scopes must never reach persistence.
export const INTERNAL_SEARCH_SCOPE = 'PUBLIC_CATALOG';
export interface SearchActorContext { readonly actorReferenceId: string; }

export class ManageSearchUseCase {
  constructor(
    private readonly searchRequestRepository: ISearchRequestRepository,
    private readonly searchEngineGateway: ISearchEngineGateway
  ) {}

  public async executeSearch(dto: SearchRequestDto, context: SearchActorContext): Promise<{ request: SearchRequest; result: SearchResult }> {
    this.assertActor(context);
    if (dto.scope !== INTERNAL_SEARCH_SCOPE) throw new Error('SEARCH_SCOPE_UNSUPPORTED');
    const rawId = `search-req-${randomUUID()}`;
    const rawRef = `search-ref-${randomUUID()}`;

    const id = SearchRequestId.create(rawId);
    const reference = SearchReference.create(rawRef);

    const scope = SearchScope.create(dto.scope);

    const query = dto.criteria.query || '';
    const filters = (dto.criteria.filters || []).map(f => {
      const op = FilterComparison[f.operator as keyof typeof FilterComparison];
      if (!op) {
        throw new Error(`Unsupported filter comparison operator: ${f.operator}`);
      }
      return SearchFilter.create(f.field, op, f.value);
    });
    
    const logicalOp = dto.criteria.logicalOperator
      ? (LogicalOperator[dto.criteria.logicalOperator as keyof typeof LogicalOperator] || LogicalOperator.AND)
      : LogicalOperator.AND;

    const criteria = SearchCriteria.create(query, filters, logicalOp);

    const pagination = SearchPagination.create(dto.pagination.page, dto.pagination.limit);

    let sorting: SearchSorting | undefined;
    if (dto.sorting) {
      const dir = SortDirection[dto.sorting.direction as keyof typeof SortDirection];
      if (!dir) {
        throw new Error(`Unsupported sort direction: ${dto.sorting.direction}`);
      }
      sorting = SearchSorting.create(dto.sorting.field, dir);
    }

    const request = SearchRequest.create(id, reference, scope, criteria, pagination, sorting, context.actorReferenceId);

    await this.searchRequestRepository.save(request);

    const result = await this.searchEngineGateway.execute(request);

    request.complete(result.getTotalCount(), result.getExecutionTimeMs());

    await this.searchRequestRepository.save(request);

    return { request, result };
  }

  public async getSearchRequestHistory(rawReference: string, context: SearchActorContext): Promise<SearchRequest[]> {
    this.assertActor(context);
    const reference = SearchReference.create(rawReference);
    const spec = SearchRequestSpecification.byActorAndReference(
      context.actorReferenceId, reference, SearchScope.create(INTERNAL_SEARCH_SCOPE),
    );
    // Legacy rows have no attributable actor and remain inaccessible here. Never
    // infer ownership from possession of a reference, a scope, or the current user.
    const requests = await this.searchRequestRepository.findBy(spec);
    return requests.filter(request => spec.isSatisfiedBy(request));
  }

  private assertActor(context: SearchActorContext): void {
    if (!context?.actorReferenceId?.trim()) throw new Error('SEARCH_ACTOR_REQUIRED');
  }
}
