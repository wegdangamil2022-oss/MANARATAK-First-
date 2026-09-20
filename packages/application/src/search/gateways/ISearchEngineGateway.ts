import { SearchRequest, SearchResult, type SearchMatch } from '@manaratak/domain';

export type PublicSearchKind =
  | 'scholarships'
  | 'universities'
  | 'majors'
  | 'countries'
  | 'courses'
  | 'exams'
  | 'articles'
  | 'services'
  | 'tools'
  | 'jobs';

export interface PublicSearchInput {
  query: string;
  locale: 'ar' | 'en';
  limit: number;
  cursor?: string;
  kinds?: PublicSearchKind[];
}

export interface PublicSearchCursorPage {
  items: SearchMatch[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ISearchEngineGateway {
  execute(request: SearchRequest): Promise<SearchResult>;
}

export interface IPublicSearchGateway extends ISearchEngineGateway {
  searchPublic(input: PublicSearchInput): Promise<PublicSearchCursorPage>;
}
