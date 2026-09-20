import { describe, expect, it } from 'vitest';
import { container, registerDependencies } from '../../../../src/infrastructure/di/container';
import { AdminMajorUseCases } from '@manaratak/application';

describe('Check API E2E', () => {
  it('print all MAS-111X', async () => {
    registerDependencies();
    const adminMajorUseCases = container.resolve<AdminMajorUseCases>('adminMajorUseCases');
    const result = await adminMajorUseCases.listMajors({ search: 'MAS-111' });
    console.log("Count:", result.data.length);
    console.log("Codes:", result.data.map(d => d.classificationCode));
    result.data.forEach(d => {
      console.log(d.classificationCode, "->", d.sourceClassificationSystem, d.optionalFields?.sourceClassificationSystem);
    });
  });
});
