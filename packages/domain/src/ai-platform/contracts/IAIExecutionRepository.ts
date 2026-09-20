import { AIExecutionLogDto, CreateAIExecutionLogDto } from '../entities';

export interface IAIExecutionRepository {
  createLog(data: CreateAIExecutionLogDto): Promise<AIExecutionLogDto>;
  findLogByPublicId(publicId: string): Promise<AIExecutionLogDto | null>;
  listLogs(filters: {
    purpose?: string;
    status?: string;
    requesterReferenceId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    data: AIExecutionLogDto[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;
}
