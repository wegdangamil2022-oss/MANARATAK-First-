/** Runtime-only approved-environment bootstrap. Never run during source implementation. */
import { PrismaClient } from '@prisma/client';
import { requireDatabaseMutationGate } from './lib/require-database-mutation-gate';
import { installOfficialStudentToolRegistry } from '@manaratak/application';
import { PrismaStudentToolRegistryRepository } from '@manaratak/infrastructure';
requireDatabaseMutationGate('seed-student-tools-registry', { allowedPurposes: ['seed'] });
const prisma=new PrismaClient();
async function main() {
  const repository = new PrismaStudentToolRegistryRepository(prisma);
  const definitions = await installOfficialStudentToolRegistry(repository, 'phase18-approved-runtime-bootstrap');
  console.log(`PHASE18_REGISTRY_INSTALLED=${definitions.length}`);
}
main().finally(()=>prisma.$disconnect());
