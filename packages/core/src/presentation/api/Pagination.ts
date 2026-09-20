export interface IPaginationRequest {
  page: number;
  limit: number;
}

export interface ISortRequest {
  field: string;
  direction: 'asc' | 'desc';
}

export interface IFilterRequest {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: string | number | boolean | Array<string | number>;
}

export interface IQueryRequest {
  pagination?: IPaginationRequest;
  sort?: ISortRequest[];
  filters?: IFilterRequest[];
}
