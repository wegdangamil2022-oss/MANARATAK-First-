import { describe, expect, it } from 'vitest';
import { container, registerDependencies } from '../../../../src/infrastructure/di/container';
import { AdminMajorUseCases } from '@manaratak/application';

describe('Check API E2E', () => {
  it('count all', async () => {
    registerDependencies();
    const adminMajorUseCases = container.resolve<AdminMajorUseCases>('adminMajorUseCases');
    const result = await adminMajorUseCases.listMajors({ pageSize: 500 });
    console.log("Returned:", result.data.length, "Total:", result.total);
  });
});
