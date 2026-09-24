import { describe, expect, it } from 'vitest';
import { container, registerDependencies } from '../../../src/infrastructure/di/container';
import { CapturedEmailDeliveryGateway, SmtpEmailDeliveryGateway } from '@manaratak/infrastructure';

describe('M5 email composition', () => {
  it('keeps captured delivery available for source tests', () => {
    registerDependencies({ NODE_ENV: 'test' }, null);
    container.cache.clear();
    expect(container.resolve('emailDeliveryGateway')).toBeInstanceOf(CapturedEmailDeliveryGateway);
  });

  it('selects the configured SMTP adapter for local runtime', () => {
    registerDependencies({ NODE_ENV: 'development', EMAIL_DELIVERY_PROVIDER: 'smtp', SMTP_HOST: '127.0.0.1', SMTP_PORT: '1025', SMTP_SECURE: 'false', SMTP_FROM: 'no-reply@localhost' }, null);
    container.cache.clear();
    expect(container.resolve('emailDeliveryGateway')).toBeInstanceOf(SmtpEmailDeliveryGateway);
  });

  it('does not silently capture production email', () => {
    registerDependencies({ NODE_ENV: 'production' }, null);
    container.cache.clear();
    expect(() => container.resolve('emailDeliveryGateway')).toThrow(/not configured/);
  });
});
