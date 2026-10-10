import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Future persistent asset references must not bypass deletion/retention impact checks.
const schema = readFileSync(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8');
const gateway = readFileSync(
  new URL('../../src/asset-platform/PrismaAssetUsageRegistryGateway.ts', import.meta.url), 'utf8',
);

type AssetField = { model: string; field: string; type: string };
function assetFields(): AssetField[] {
  const references: AssetField[] = [];
  const models = [...schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)];
  for (const model of models) {
    for (const line of model[2].split('\n')) {
      const match = line.trim().match(/^(\w*AssetIds?|assetId)\s+(String\??|Json\??)(?:\s|$)/);
      if (match) references.push({ model: model[1], field: match[1], type: match[2] });
    }
  }
  return references;
}

const toDelegate = (model: string) => model[0].toLowerCase() + model.slice(1);
const mappingKey = (model: string, field: string) => toDelegate(model) + '.' + field;
const directMappings = [...gateway.matchAll(
  /\{\s*delegate:\s*'(\w+)',\s*field:\s*'(\w+)',\s*consumer:\s*'(\w+)'/g,
)].map((m) => m[1] + '.' + m[2]);

describe('EAP schema-backed asset consumer inventory', () => {
  it('covers every persisted String asset reference field and detects stale mapping', () => {
    const fields = assetFields();
    const singleReferences = fields.filter((field) => field.type.startsWith('String'));
    const covered = new Set(directMappings);
    expect(singleReferences.length).toBeGreaterThan(0);
    const missing = singleReferences
      .map((entry) => mappingKey(entry.model, entry.field))
      .filter((key) => !covered.has(key));
    expect(missing, 'Unmapped asset references: ' + missing.join(', ')).toEqual([]);
    const schemaFields = new Set(singleReferences.map((f) => mappingKey(f.model, f.field)));
    const stale = directMappings.filter((key) => !schemaFields.has(key));
    expect(stale, 'Stale direct asset usage check(s): ' + stale.join(', ')).toEqual([]);
  });

  it('requires an explicit JSON array consumer check instead of assuming zero usage', () => {
    const jsonReferences = assetFields().filter((field) => field.type.startsWith('Json'));
    expect(jsonReferences.map((f) => f.model + '.' + f.field))
      .toEqual(['CmsPublishedContent.attachmentAssetIds']);
    expect(gateway).toContain('attachmentAssetIds: { array_contains: [id.value] }');
    expect(gateway).toContain("consumer: 'CMS_PUBLISHED_ATTACHMENTS'");
  });

  it('keeps SEO JSON asset fields in the derived registry', () => {
    for (const model of ['cmsContentNode', 'cmsLocalizedContent', 'cmsPublishedContent']) {
      expect(gateway).toContain("delegate: '" + model + "', consumer:");
    }
    expect(gateway).toContain("path: ['openGraphAssetId']");
  });
});
