import {
  CANONICAL_DEGREE_LEVEL_CODES,
  CanonicalDegreeLevelCode,
  DegreeLevelDto,
  DegreeLevelStatus,
  IDegreeLevelRepository
} from '@manaratak/domain';

export interface UpdateDegreeLevelCommand {
  nameEn: string;
  nameAr: string;
  displayRank?: number;
  status?: DegreeLevelStatus;
}

export class DegreeLevelUseCases {
  constructor(private readonly repository: IDegreeLevelRepository) {}

  public list(): Promise<DegreeLevelDto[]> {
    return this.repository.listDegreeLevels();
  }

  public getById(id: string): Promise<DegreeLevelDto | null> {
    return this.repository.getDegreeLevelById(id);
  }

  public getByCanonicalCode(code: string): Promise<DegreeLevelDto | null> {
    return this.repository.getDegreeLevelByCode(this.assertCanonicalCode(code));
  }

  public async update(id: string, command: UpdateDegreeLevelCommand): Promise<DegreeLevelDto | null> {
    const existing = await this.repository.getDegreeLevelById(id);
    if (!existing) return null;
    return this.repository.upsertDegreeLevel({
      canonicalCode: this.assertCanonicalCode(existing.canonicalCode),
      nameEn: command.nameEn,
      nameAr: command.nameAr,
      displayRank: command.displayRank ?? existing.displayRank,
      status: command.status ?? existing.status,
      aliases: existing.aliases,
      metadata: existing.metadata
    });
  }

  private assertCanonicalCode(code: string): CanonicalDegreeLevelCode {
    if (!(CANONICAL_DEGREE_LEVEL_CODES as readonly string[]).includes(code)) {
      throw new Error(`Unsupported canonical DegreeLevel code: ${code}`);
    }
    return code as CanonicalDegreeLevelCode;
  }
}
