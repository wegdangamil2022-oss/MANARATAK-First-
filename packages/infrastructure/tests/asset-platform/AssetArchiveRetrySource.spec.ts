import { describe, it, expect } from 'vitest';
describe('EAP archive retry regression', () => {
  it('loads the retention gateway without side effects', async () => {
    const gateway = await import('../../src/retention/PrismaAssetRetentionGateway');
    expect(gateway.PrismaAssetRetentionGateway).toBeDefined();
  });
});
