import { PrismaClient } from '@prisma/client';
import { AcademicTaxonomyDeterministicKey } from '../packages/domain/src/academic-taxonomy/key';
import {
  iscedFBaselineNodes,
  iscedFBaselineEdges,
  iscedFBaselineAliases,
  iscedFBaselineMappings,
} from '../packages/domain/src/academic-taxonomy/isced-f-baseline';
import { requireDatabaseMutationGate } from './lib/require-database-mutation-gate';

requireDatabaseMutationGate('seed-taxonomy', { allowedPurposes: ['seed'] });

let url = process.env.DATABASE_URL;
if (!url || url.includes('postgres-host') || url.includes('placeholder')) {
  const { SQL_USER, SQL_PASSWORD, SQL_HOST, SQL_DB_NAME } = process.env;
  if (SQL_USER && SQL_PASSWORD && SQL_HOST && SQL_DB_NAME) {
    const encodedPassword = encodeURIComponent(SQL_PASSWORD);
    url = `postgresql://${SQL_USER}:${encodedPassword}@localhost/${SQL_DB_NAME}?host=${SQL_HOST}`;
    process.env.DATABASE_URL = url;
  }
}

const prisma = new PrismaClient();

const taxonomyNodes = iscedFBaselineNodes;
const taxonomyEdges = iscedFBaselineEdges;
const taxonomyAliases = iscedFBaselineAliases;
const taxonomyMappings = iscedFBaselineMappings;


async function seedTaxonomy() {
  console.log('[SeedTaxonomy] Starting canonical academic taxonomy baseline seeding...');

  try {
    // Check db connection first
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    throw new Error('[SeedTaxonomy] Database connection failed; no taxonomy data was written.', { cause: e });
  }

  const idMap = new Map<string, string>();

  // 1. Upsert Nodes
  for (const node of taxonomyNodes) {
    const deterministicKey = AcademicTaxonomyDeterministicKey.create({
      nodeType: node.nodeType,
      canonicalCode: node.canonicalCode,
      standardType: node.standardType
    });

    const record = await prisma.academicTaxonomyNode.upsert({
      where: { deterministicKey },
      update: {
        ...node,
      },
      create: {
        ...node,
        deterministicKey,
      },
    });
    idMap.set(deterministicKey, record.id);
  }

  console.log(`[SeedTaxonomy] Successfully seeded ${taxonomyNodes.length} taxonomy nodes.`);

  // 2. Upsert Edges
  let edgeCount = 0;
  for (const edge of taxonomyEdges) {
    const parentNodeId = idMap.get(edge.parent);
    const childNodeId = idMap.get(edge.child);

    if (!parentNodeId || !childNodeId) {
      console.warn(`[SeedTaxonomy] Skipping edge ${edge.parent} -> ${edge.child} due to missing node ID.`);
      continue;
    }

    await prisma.academicTaxonomyEdge.upsert({
      where: {
        parentNodeId_childNodeId: {
          parentNodeId,
          childNodeId
        }
      },
      update: {
        isPrimary: true
      },
      create: {
        parentNodeId,
        childNodeId,
        isPrimary: true
      }
    });
    edgeCount++;
  }
  
    console.log(`[SeedTaxonomy] Successfully seeded ${edgeCount} taxonomy edges.`);

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
  console.log(`[SeedTaxonomy] Successfully seeded ${aliasCount} taxonomy aliases.`);

}

seedTaxonomy()
  .catch((e) => {
    console.error('[SeedTaxonomy] Error seeding taxonomy:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
