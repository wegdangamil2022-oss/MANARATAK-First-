import { describe, expect, it } from 'vitest';
import { container, registerDependencies } from '../../../../src/infrastructure/di/container';

const describeWithDatabase = process.env.RUN_MAJOR_DATASET_INTEGRATION_TESTS === 'true'
  ? describe
  : describe.skip;

describeWithDatabase('Check DB E2E', () => {
  it('print MAS-1116', async () => {
    registerDependencies();
    const prisma = container.resolve('prisma') as any;
    
    // In PrismaMajorRepository.ts, code is stored on MajorLevelProfile
    const mas1116 = await prisma.majorLevelProfile.findFirst({
      where: { code: 'MAS-1116' },
      include: { major: true, contentSections: true }
    });
    
    console.dir(mas1116, { depth: null });
    expect(mas1116).toBeDefined();
  });
});
