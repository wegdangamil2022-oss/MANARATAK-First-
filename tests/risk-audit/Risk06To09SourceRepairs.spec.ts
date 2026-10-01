import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('RISK-06 through RISK-09 source closure', () => {
  it('fails production or staging bootstrap when the mandatory database is unavailable', () => {
    const app = source('apps/api/src/app.ts');
    expect(app).toContain("if (databaseRequired) throw error");
    expect(app).toContain("DATABASE_URL is required for this runtime mode");
  });

  it('does not hide Major catalog DB enrichment failures in runtime environments', () => {
    const catalog = source('packages/infrastructure/src/majors/Phase10CatalogRepository.ts');
    expect(catalog).toContain('this.options.catalogPath');
    expect(catalog).toContain('this.options.productionLike === true');
    expect(catalog).not.toContain('process.env');
  });

  it('persists the canonical currency reference for international test fees', () => {
    const schema = source('packages/infrastructure/prisma/schema.prisma');
    expect(schema).toMatch(/model InternationalTestFeeMetadata[\s\S]*currencyReferenceId\s+String/);
    expect(schema).toMatch(/currencyReference\s+ReferenceCurrency/);
  });

  it('classifies local asset storage as development-only', () => {
    const storage = source('packages/infrastructure/src/asset-platform/LocalAssetStorageGateway.ts');
    expect(storage).toContain('LOCAL_ASSET_STORAGE_DEVELOPMENT_ONLY');
  });
});
