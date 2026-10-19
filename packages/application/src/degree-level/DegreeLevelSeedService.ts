import type { IDegreeLevelRepository } from '@manaratak/domain';
export class DegreeLevelSeedService {
  constructor(private readonly repository: IDegreeLevelRepository) {}
  async seedDegreeLevels(): Promise<void> { void this.repository; }
}
