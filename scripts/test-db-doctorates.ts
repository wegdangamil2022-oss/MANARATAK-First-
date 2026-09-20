import { PrismaClient } from '@prisma/client';

async function run() {
  const prisma = new PrismaClient();
  
  const codes = ['DOC-0501', 'DOC-0600', 'DOC-0601', 'DOC-0700', 'DOC-0701', 'DOC-0800', 'DOC-0801', 'DOC-0900', 'DOC-0901', 'DOC-1000', 'DOC-1001', 'DOC-1100', 'DOC-1101', 'DOC-1114'];

  for (const code of codes) {
    const major = await prisma.major.findFirst({
        where: { classificationCode: code },
        include: {
            profiles: true,
            sections: true,
            versions: true,
            sources: true
        }
    });

    if (major) {
        console.log(`Found ${code}: ${major.canonicalName}`);
        console.log(`  Profiles: ${major.profiles.length}`);
        console.log(`  Sections: ${major.sections.length}`);
        console.log(`  Versions: ${major.versions.length}`);
        console.log(`  Sources: ${major.sources.length}`);
    } else {
        console.log(`Not Found: ${code}`);
    }
  }
}

run().catch(console.error);
