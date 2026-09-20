import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ScholarshipCompletenessState,
  ScholarshipStatus,
  type CreateScholarshipDto,
  type IScholarshipRepository,
  type ITransactionalScholarshipRepository,
  type ScholarshipDto,
  type ScholarshipPage,
} from '../../src/index';
import { AdminScholarshipUseCases } from '../../../application/src/scholarships/use-cases/AdminScholarshipUseCases';
import { PublicScholarshipUseCases } from '../../../application/src/scholarships/use-cases/PublicScholarshipUseCases';
import { PrismaScholarshipRepository } from '../../../infrastructure/src/scholarships/PrismaScholarshipRepository';

function collectTypeScriptFiles(path: string): string[] {
  const absolute = resolve(process.cwd(), path);
  if (!statSync(absolute).isDirectory()) return [absolute];

  return readdirSync(absolute).flatMap((entry) => {
    const child = resolve(absolute, entry);
    return statSync(child).isDirectory()
      ? collectTypeScriptFiles(child)
      : child.endsWith('.ts') || child.endsWith('.tsx')
        ? [child]
        : [];
  });
}

describe('WP12-1 real Scholarship contracts', () => {
  it('has no production Scholarship import from generated/dummy', () => {
    const productionScopes = [
      'packages/domain/src/scholarships',
      'packages/application/src/scholarships',
      'packages/infrastructure/src/scholarships',
      'apps/api/src/presentation/api/router/ScholarshipAdminRouter.ts',
      'apps/api/src/presentation/api/router/ScholarshipPublicRouter.ts',
    ];

    const offenders = productionScopes
      .flatMap(collectTypeScriptFiles)
      .filter((file) => readFileSync(file, 'utf8').includes('generated/dummy'));

    expect(offenders).toEqual([]);
  });

  it('exports Scholarship-owned enums, DTOs and repository contracts from the domain root', () => {
    expect(ScholarshipStatus.IMPORTED).toBe('IMPORTED');
    expect(ScholarshipCompletenessState.COMPLETE).toBe('COMPLETE');

    const create: CreateScholarshipDto = {
      publicId: 'schol-contract-1',
      slug: 'scholarship-contract-1',
      canonicalName: 'Scholarship Contract 1',
      canonicalDedupKey: 'scholarship contract 1|provider',
      displayName: 'Scholarship Contract 1',
      status: ScholarshipStatus.IMPORTED,
      completenessStatus: ScholarshipCompletenessState.COMPLETE,
    };
    const dto: ScholarshipDto = {
      ...create,
      id: 'internal-id',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const page: ScholarshipPage<ScholarshipDto> = {
      data: [dto],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    };

    expect(page.data[0].publicId).toBe(create.publicId);
  });

  it('keeps application use cases and Prisma infrastructure assignable to the new contracts', () => {
    const prismaRepository = new PrismaScholarshipRepository({} as never);
    const repository: IScholarshipRepository = prismaRepository;
    const transactionalRepository: ITransactionalScholarshipRepository = prismaRepository;

    expect(new AdminScholarshipUseCases(repository)).toBeInstanceOf(AdminScholarshipUseCases);
    expect(new PublicScholarshipUseCases(repository)).toBeInstanceOf(PublicScholarshipUseCases);
    expect(transactionalRepository).toBe(prismaRepository);
  });
});
