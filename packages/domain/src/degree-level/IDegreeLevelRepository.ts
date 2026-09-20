import { DegreeLevelDto, UpsertDegreeLevelDto } from './DegreeLevel';

export interface IDegreeLevelRepository {
  listDegreeLevels(): Promise<DegreeLevelDto[]>;
  getDegreeLevelByCode(code: string): Promise<DegreeLevelDto | null>;
  getDegreeLevelById(id: string): Promise<DegreeLevelDto | null>;
  upsertDegreeLevel(data: UpsertDegreeLevelDto): Promise<DegreeLevelDto>;
}
