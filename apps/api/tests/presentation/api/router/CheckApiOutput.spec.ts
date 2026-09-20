import { describe, expect, it } from 'vitest';
import { container, registerDependencies } from '../../../../src/infrastructure/di/container';
import { AdminMajorUseCases } from '@manaratak/application';

describe('Check API Output', () => {
  it('print MAS-1116 optional fields', async () => {
    registerDependencies();
    const adminMajorUseCases = container.resolve<AdminMajorUseCases>('adminMajorUseCases');
    const result = await adminMajorUseCases.listMajors({ search: 'MAS-1116' });
    console.log(result.data[0]);
  });
});
