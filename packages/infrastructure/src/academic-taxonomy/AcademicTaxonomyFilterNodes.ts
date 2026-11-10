import { Prisma, type PrismaClient } from "@prisma/client";
/** UNION terminates traversal even if the stored graph contains a cycle. */
export async function academicTaxonomyFilterNodeIds(
  prisma: Pick<PrismaClient, "$queryRaw">,
  id: string,
): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    WITH RECURSIVE field_nodes(id) AS (
      SELECT id FROM "AcademicTaxonomyNode" WHERE id=${id} AND status='ACTIVE'
      UNION SELECT n.id FROM "AcademicTaxonomyEdge" e JOIN field_nodes p ON p.id=e."parentNodeId"
        JOIN "AcademicTaxonomyNode" n ON n.id=e."childNodeId" WHERE n.status='ACTIVE'
    ) SELECT id FROM field_nodes`);
  return rows.map((row) => row.id);
}
