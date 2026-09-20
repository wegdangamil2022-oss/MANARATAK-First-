import { Request } from 'express';
import { IQueryRequest, IPaginationRequest, ISortRequest, IFilterRequest } from '@manaratak/core';

export class QueryParser {
  public static parse(req: Request): IQueryRequest {
    return {
      pagination: this.parsePagination(req),
      sort: this.parseSort(req),
      filters: this.parseFilters(req)
    };
  }

  private static parsePagination(req: Request): IPaginationRequest {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    
    return {
      page: page > 0 ? page : 1,
      limit: limit > 0 && limit <= 100 ? limit : 10
    };
  }

  private static parseSort(req: Request): ISortRequest[] | undefined {
    const sortParams = req.query.sort as string;
    if (!sortParams) return undefined;

    return sortParams.split(',').map(param => {
      const isDesc = param.startsWith('-');
      return {
        field: isDesc ? param.substring(1) : param,
        direction: isDesc ? 'desc' : 'asc'
      };
    });
  }

  private static parseFilters(req: Request): IFilterRequest[] | undefined {
    const filters: IFilterRequest[] = [];
    
    for (const key in req.query) {
      if (['page', 'limit', 'sort'].includes(key)) continue;

      const value = req.query[key];
      if (typeof value === 'string') {
         filters.push({
           field: key,
           operator: 'eq',
           value: value
         });
      }
    }

    return filters.length > 0 ? filters : undefined;
  }
}
