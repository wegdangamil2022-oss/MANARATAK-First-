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

export class ManageSearchUseCase {
  constructor(
    private readonly searchRequestRepository: ISearchRequestRepository,
    private readonly searchEngineGateway: ISearchEngineGateway
  ) {}

  public async executeSearch(dto: SearchRequestDto): Promise<{ request: SearchRequest; result: SearchResult }> {
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

    const request = SearchRequest.create(id, reference, scope, criteria, pagination, sorting);

    await this.searchRequestRepository.save(request);

    const result = await this.searchEngineGateway.execute(request);

    request.complete(result.getTotalCount(), result.getExecutionTimeMs());

    await this.searchRequestRepository.save(request);

    return { request, result };
  }

  public async getSearchRequestHistory(rawReference: string): Promise<SearchRequest[]> {
    const reference = SearchReference.create(rawReference);
    const spec = SearchRequestSpecification.byReference(reference);
    return this.searchRequestRepository.findBy(spec);
  }
}
