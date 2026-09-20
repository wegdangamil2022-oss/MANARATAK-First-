import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaExternalCourseProviderRepository } from '../../src/courses/PrismaExternalCourseProviderRepository';
import { destructiveDatabaseTestsEnabled } from './disposableDatabaseGuard';
import { seedExternalCourseProviders } from '../../src/courses/ExternalCourseProviderSeed';

const databaseUrl = process.env.COURSE_PROVIDER_TEST_DATABASE_URL;
const disposable = process.env.COURSE_PROVIDER_TEST_DATABASE_IS_DISPOSABLE === 'true';
const describeDisposable = databaseUrl && disposable && destructiveDatabaseTestsEnabled(databaseUrl) ? describe : describe.skip;

describeDisposable('WP-IC-02 provider registry disposable PostgreSQL integration', () => {
  let prisma: PrismaClient;
  let repository: PrismaExternalCourseProviderRepository;

  beforeAll(async () => {
    if (!databaseUrl || !disposable) throw new Error('Dedicated disposable provider registry database is required');
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
    repository = new PrismaExternalCourseProviderRepository(prisma);
  });

  beforeEach(async () => {
    await prisma.externalCourseProvider.deleteMany({ where: { publicId: { startsWith: 'ecp-' } } });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.externalCourseProvider.deleteMany({ where: { publicId: { startsWith: 'ecp-' } } });
      await prisma.$disconnect();
    }
  });

  it('seeds 18 providers idempotently and resolves canonical names and aliases', async () => {
    await seedExternalCourseProviders(repository);
    await seedExternalCourseProviders(repository);

    expect((await repository.list())).toHaveLength(18);
    const canonical = await repository.resolveByName('The Open University — OpenLearn');
    const alias = await repository.resolveByName('OpenLearn');
    expect(canonical?.id).toBeTruthy();
    expect(alias?.id).toBe(canonical?.id);
    expect(canonical?.headquartersCountryReferenceId).toBeUndefined();
    expect(await repository.isDomainApproved(canonical!.id, 'https://www.open.edu/openlearn/course')).toBe(true);
    expect(await repository.isDomainApproved(canonical!.id, 'https://example.invalid/course')).toBe(false);

    const freeCodeCamp = await repository.resolveByName('freeCodeCamp');
    expect(await repository.isDomainApproved(freeCodeCamp!.id, 'https://www.freecodecamp.org/learn')).toBe(true);
    expect(await repository.isDomainApproved(freeCodeCamp!.id, 'https://example.invalid/course')).toBe(false);
    expect(await repository.isDomainApproved(freeCodeCamp!.id, 'https://www.youtube.com/watch?v=ARBITRARY')).toBe(false);
  });
});
