import { describe, expect, it, vi } from 'vitest';
import { ManageNotificationTemplatesUseCase } from '../../packages/application/src/notification/use-cases/ManageNotificationTemplatesUseCase';
const dto = {
  id: 'manual-unique',
  channels: ['IN_APP'],
  requiredVariables: ['name'],
  localizations: ['ar', 'en'],
  contents: {
    ar: { subject: 'مرحبا', body: '{{name}}' },
    en: { subject: 'Hello', body: '{{name}}' },
  },
};
describe('Section 23 template definition uniqueness', () => {
  it.each(['localizations', 'requiredVariables'])(
    'denies duplicate %s before template persistence',
    async (field) => {
      const repo = { save: vi.fn() };
      const value = {
        ...dto,
        [field]: field === 'localizations' ? ['ar', 'ar'] : ['name', 'name'],
      };
      await expect(
        new ManageNotificationTemplatesUseCase(repo as never).createTemplate(value),
      ).rejects.toThrow();
      expect(repo.save).not.toHaveBeenCalled();
    },
  );
  it('preserves an unambiguous bilingual definition', async () => {
    const repo = { save: vi.fn() };
    await new ManageNotificationTemplatesUseCase(repo as never).createTemplate(dto);
    expect(repo.save).toHaveBeenCalledOnce();
  });
});
