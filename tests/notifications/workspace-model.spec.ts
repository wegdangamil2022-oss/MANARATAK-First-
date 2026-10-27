import { describe, expect, it } from 'vitest';
import {
  dateWindow,
  safeReturn,
  validateTemplate,
  statusName,
} from '../../apps/admin/src/features/notifications/notificationModel';
describe('Notification date, navigation and authoring boundaries', () => {
  it('uses inclusive UTC calendar dates with an exclusive following-day boundary', () => {
    expect(dateWindow('custom', '2026-10-01', '2026-10-31')).toEqual({
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-11-01T00:00:00.000Z',
    });
    expect(dateWindow('custom', '2026-10-01', '2026-11-01')).toBeNull();
    expect(dateWindow('custom', '2026-10-05', '2026-10-01')).toBeNull();
    expect(dateWindow('custom', '2026-02-31', '2026-03-04')).toBeNull();
    expect(dateWindow('custom', '', '')).toBeNull();
  });
  it('preserves only permitted internal list state on deep-link returns', () => {
    expect(safeReturn('https://example.test')).toBe('/notifications');
    expect(safeReturn('//evil.test/notifications')).toBe('/notifications');
    expect(safeReturn('/notifications?tab=templates&channel=EMAIL&injected=value')).toBe(
      '/notifications?tab=templates&channel=EMAIL',
    );
  });
  const template = {
    id: 'manual.test',
    channels: ['EMAIL'],
    variables: ['name'],
    contents: {
      ar: { subject: 'مرحبًا {{name}}', body: 'رسالة' },
      en: { subject: 'Hello {{name}}', body: 'Message' },
    },
  };
  it('requires complete bilingual content and validates declared non-sensitive variables', () => {
    expect(validateTemplate(template)).toBe(true);
    expect(validateTemplate({ ...template, variables: ['password'] })).toBe(false);
    expect(validateTemplate({ ...template, variables: [] })).toBe(false);
    expect(
      validateTemplate({
        ...template,
        contents: { ...template.contents, en: { subject: '', body: 'text' } },
      }),
    ).toBe(false);
    expect(
      validateTemplate({
        ...template,
        contents: { ...template.contents, en: { subject: 'Hi', body: '<script>bad</script>' } },
      }),
    ).toBe(false);
    expect(validateTemplate({ ...template, id: 'system.protected' })).toBe(false);
    expect(validateTemplate({ ...template, channels: [] })).toBe(false);
  });
  it('does not equate acceptance, delivery and reading', () => {
    expect(statusName('ACCEPTED', false)).toContain('arrival unconfirmed');
    expect(statusName('DELIVERED', false)).toContain('not a read receipt');
  });
});
