import * as fs from 'fs';

let script = fs.readFileSync('scripts/seed-taxonomy.ts', 'utf-8');

const edgesInsertion = `  console.log(\`[SeedTaxonomy] Successfully seeded \${edgeCount} taxonomy edges.\`);

  // 3. Upsert Aliases
  let aliasCount = 0;
  for (const alias of taxonomyAliases) {
    const nodeId = idMap.get(alias.nodeKey);
    if (!nodeId) continue;
    
    await prisma.academicTaxonomyAlias.upsert({
      where: {
        nodeId_locale_normalizedAlias: {
          nodeId,
          locale: alias.locale || '',
          normalizedAlias: alias.alias.toLowerCase().trim()
        }
      },
      update: {},
      create: {
        nodeId,
        locale: alias.locale,
        alias: alias.alias,
        normalizedAlias: alias.alias.toLowerCase().trim()
      }
    });
    aliasCount++;
  }
  console.log(\`[SeedTaxonomy] Successfully seeded \${aliasCount} taxonomy aliases.\`);
`;

script = script.replace('console.log(`[SeedTaxonomy] Successfully seeded ${edgeCount} taxonomy edges.`);', edgesInsertion);

fs.writeFileSync('scripts/seed-taxonomy.ts', script);
