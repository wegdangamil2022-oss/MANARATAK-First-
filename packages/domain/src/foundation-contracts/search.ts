import { DomainSpecification, StringValue, UnknownRecord } from './common';

export enum FilterComparison { EQ='EQ', NE='NE', GT='GT', GTE='GTE', LT='LT', LTE='LTE', CONTAINS='CONTAINS', IN='IN' }
export enum LogicalOperator { AND='AND', OR='OR' }
export enum SortDirection { ASC='ASC', DESC='DESC' }

export class SearchRequestId extends StringValue {
  private constructor(value: string) { super(value, 'Search request id'); }
  static create(value: string): SearchRequestId { return new SearchRequestId(value); }
}
export class SearchReference extends StringValue {
  private constructor(value: string) { super(value, 'Search reference'); }
  static create(value: string): SearchReference { return new SearchReference(value); }
}
export class SearchScope extends StringValue {
  private constructor(value: string) { super(value, 'Search scope'); }
  static create(value: string): SearchScope { return new SearchScope(value); }
}
export class SearchFilter {
  private constructor(public readonly field: string, public readonly operator: FilterComparison, public readonly value: unknown) {
    if (!field.trim()) throw new Error('Search filter field is required');
  }
  static create(field: string, operator: FilterComparison, value: unknown): SearchFilter { return new SearchFilter(field, operator, value); }
}
export class SearchCriteria {
  private constructor(public readonly query: string, public readonly filters: readonly SearchFilter[], public readonly logicalOperator: LogicalOperator) {}
  static create(query: string, filters: readonly SearchFilter[], logicalOperator: LogicalOperator): SearchCriteria { return new SearchCriteria(query, Object.freeze([...filters]), logicalOperator); }
}
export class SearchPagination {
  private constructor(public readonly page: number, public readonly limit: number) {
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('Invalid search pagination');
  }
  static create(page: number, limit: number): SearchPagination { return new SearchPagination(page, limit); }
}
export class SearchSorting {
  private constructor(public readonly field: string, public readonly direction: SortDirection) { if (!field.trim()) throw new Error('Search sort field is required'); }
  static create(field: string, direction: SortDirection): SearchSorting { return new SearchSorting(field, direction); }
}

export type SearchMatch = Readonly<{ target: Readonly<{ entityNamespace: string; resourceKey: string }>; score: number; payload: UnknownRecord }>;
export class SearchResult {
  constructor(
    private readonly totalCount: number,
    private readonly executionTimeMs: number,
    public readonly matches: readonly SearchMatch[] = [],
  ) {
    if (!Number.isInteger(totalCount) || totalCount < 0 || !Number.isFinite(executionTimeMs) || executionTimeMs < 0) throw new Error('Invalid search result metrics');
  }
  getTotalCount(): number { return this.totalCount; }
  getExecutionTimeMs(): number { return this.executionTimeMs; }
}

export enum SearchRequestState { PENDING='PENDING', COMPLETED='COMPLETED' }
export class SearchRequest {
  private state = SearchRequestState.PENDING;
  private totalCount?: number;
  private executionTimeMs?: number;
  private readonly createdAt: Date;
  private constructor(
    private readonly id: SearchRequestId,
    private readonly reference: SearchReference,
    public readonly scope: SearchScope,
    public readonly criteria: SearchCriteria,
    public readonly pagination: SearchPagination,
    public readonly sorting?: SearchSorting,
    createdAt: Date = new Date(),
  ) { this.createdAt = new Date(createdAt); }
  static create(id: SearchRequestId, reference: SearchReference, scope: SearchScope, criteria: SearchCriteria, pagination: SearchPagination, sorting?: SearchSorting): SearchRequest {
    return new SearchRequest(id, reference, scope, criteria, pagination, sorting);
  }
  static restore(input: {
    id: SearchRequestId;
    reference: SearchReference;
    scope: SearchScope;
    criteria: SearchCriteria;
    pagination: SearchPagination;
    sorting?: SearchSorting;
    state: SearchRequestState;
    totalCount?: number;
    executionTimeMs?: number;
    createdAt: Date;
  }): SearchRequest {
    const request = new SearchRequest(input.id, input.reference, input.scope, input.criteria, input.pagination, input.sorting, input.createdAt);
    if (input.state === SearchRequestState.COMPLETED) request.complete(input.totalCount ?? 0, input.executionTimeMs ?? 0);
    return request;
  }
  getId(): SearchRequestId { return this.id; }
  getReference(): SearchReference { return this.reference; }
  getScope(): SearchScope { return this.scope; }
  getCriteria(): SearchCriteria { return this.criteria; }
  getPagination(): SearchPagination { return this.pagination; }
  getSorting(): SearchSorting | undefined { return this.sorting; }
  getTimestamp(): Date { return new Date(this.createdAt); }
  getIsCompleted(): boolean { return this.state === SearchRequestState.COMPLETED; }
  getIsExpired(now: Date = new Date(), retentionMs = 24 * 60 * 60 * 1000): boolean { return now.getTime() - this.createdAt.getTime() > retentionMs; }
  complete(totalCount: number, executionTimeMs: number): void {
    if (!Number.isInteger(totalCount) || totalCount < 0 || !Number.isFinite(executionTimeMs) || executionTimeMs < 0) throw new Error('Invalid search completion metrics');
    this.totalCount = totalCount; this.executionTimeMs = executionTimeMs; this.state = SearchRequestState.COMPLETED;
  }
  getState(): SearchRequestState { return this.state; }
  getCompletion(): Readonly<{ totalCount?: number; executionTimeMs?: number }> { return { totalCount: this.totalCount, executionTimeMs: this.executionTimeMs }; }
}
export interface ISearchRequestRepository { save(request: SearchRequest): Promise<void>; findBy(specification: DomainSpecification<SearchRequest>): Promise<SearchRequest[]>; }
export class SearchRequestSpecification implements DomainSpecification<SearchRequest> {
  private constructor(private readonly reference: SearchReference) {}
  static byReference(reference: SearchReference): SearchRequestSpecification { return new SearchRequestSpecification(reference); }
  isSatisfiedBy(candidate: SearchRequest): boolean { return candidate.getReference().getValue() === this.reference.getValue(); }
}
