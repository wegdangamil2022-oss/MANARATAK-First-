/** Runtime-only Google Studio bootstrap. Never run during source implementation. */
import { PrismaClient } from '@prisma/client';
import { requireDatabaseMutationGate } from './lib/require-database-mutation-gate';
import { OFFICIAL_STUDENT_TOOLS } from '@manaratak/application';
import { PrismaStudentToolRegistryRepository } from '@manaratak/infrastructure';
requireDatabaseMutationGate('seed-student-tools-registry', { allowedPurposes: ['seed'] });
const prisma=new PrismaClient();
async function main(){const repository=new PrismaStudentToolRegistryRepository(prisma);for(const tool of OFFICIAL_STUDENT_TOOLS)await repository.upsertDefinition(tool,'google-studio-phase18-bootstrap');console.log(`PHASE18_REGISTRY_INSTALLED=${OFFICIAL_STUDENT_TOOLS.length}`);}
main().finally(()=>prisma.$disconnect());
