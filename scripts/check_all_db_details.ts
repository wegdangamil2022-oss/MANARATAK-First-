import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';
import { PrismaClient } from '@prisma/client';

async function run() {
  await registerDependencies();
  const prisma = container.resolve<PrismaClient>('prisma');
  
  const majors = await prisma.major.findMany({
    include: {
      versions: {
        include: {
          contentSections: true
        }
      }
    }
  });
  
  let withDbSectionsCount = 0;
  for (const m of majors) {
    const hasSecs = m.versions.some(v => v.contentSections.length > 0);
    if (hasSecs) {
      withDbSectionsCount++;
    }
  }
  
  console.log(`Out of ${majors.length} majors, ${withDbSectionsCount} have sections in the database!`);
}
run().catch(e => { console.error(e); process.exitCode = 1; });
