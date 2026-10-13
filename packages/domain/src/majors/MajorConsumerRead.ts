export interface MajorConsumerQuery { page?: number; countryReferenceId?: string; degreeLevelId?: string; scope?: 'ALL'|'PUBLISHED'; }
export interface MajorConsumerPage {
  data: Array<{ id: string; ownerId: string; ownerName: string; label: string; ownerStatus: string; status: string; kind: string; degreeLevelId: string | null; countryReferenceId: string | null }>;
  total: number; page: number; pageSize: number; owner: 'UNIVERSITIES'|'SCHOLARSHIPS'; scope: 'ALL'|'PUBLISHED';
  unresolvedCoverage: 'unknown'; countUnit: 'RELATIONSHIPS';
}
export interface IMajorConsumerReadGateway { usage(majorId: string, query: MajorConsumerQuery): Promise<MajorConsumerPage>; }
