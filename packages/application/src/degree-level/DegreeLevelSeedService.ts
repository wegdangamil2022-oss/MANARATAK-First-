import type { IDegreeLevelRepository } from '@absheer/domain';
export class DegreeLevelSeedService {
  constructor(private readonly repository: IDegreeLevelRepository) {}
  async seedDegreeLevels(): Promise<void> { void this.repository; }
}
