import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';
import { PrismaClient } from '@prisma/client';

async function run() {
  await registerDependencies();
  const prisma = container.resolve<PrismaClient>('prisma');
  
  const sample = await prisma.major.findFirst({
    include: {
      versions: {
        include: {
          contentSections: true
        }
      }
    }
  });
  
  console.log('Sample Sections for:', sample?.displayName);
  sample?.versions?.[0]?.contentSections?.forEach(sec => {
    console.log(`- ${sec.sectionKey}: ${sec.title}`);
  });
}
run().catch(e => { console.error(e); process.exitCode = 1; });
