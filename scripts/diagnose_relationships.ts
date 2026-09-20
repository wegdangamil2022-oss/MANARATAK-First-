import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('--- DIAGNOSTIC START ---');
  
  // 1. Total Majors
  const totalMajors = await prisma.major.count();
  console.log(`Total Majors: ${totalMajors}`);

  // 2. Majors count by degreeLevel (from optionalFields or direct if any)
  const majors = await prisma.major.findMany();
  const degreeLevelCounts: Record<string, number> = {};
  for (const m of majors) {
    const opt = (m.optionalFields && typeof m.optionalFields === 'object' && !Array.isArray(m.optionalFields)) 
      ? m.optionalFields as Record<string, any> 
      : {};
    const level = m.facultyName || opt.degreeLevel || 'Unknown';
    degreeLevelCounts[level] = (degreeLevelCounts[level] || 0) + 1;
  }
  console.log('Majors by degree level in optionalFields:', degreeLevelCounts);

  // 3. Profiles
  const totalProfiles = await prisma.majorLevelProfile.count();
  console.log(`Total MajorLevelProfiles: ${totalProfiles}`);

  // Profiles count by level
  const profilesByLevel = await prisma.majorLevelProfile.groupBy({
    by: ['level'],
    _count: { id: true }
  });
  console.log('Profiles by level:', profilesByLevel);

  // 4. Content Sections
  const totalSections = await prisma.majorContentSection.count();
  console.log(`Total MajorContentSections: ${totalSections}`);

  const profileSections = await prisma.majorContentSection.count({ where: { NOT: { profileId: null } } });
  const versionSections = await prisma.majorContentSection.count({ where: { NOT: { versionId: null } } });
  console.log(`Sections with profileId: ${profileSections}`);
  console.log(`Sections with versionId: ${versionSections}`);

  // 5. Check how many profiles have sections
  const profilesWithSections = await prisma.majorLevelProfile.findMany({
    where: {
      contentSections: { some: {} }
    },
    select: { id: true, level: true, code: true, majorId: true }
  });
  console.log(`Profiles with content sections: ${profilesWithSections.length}`);
  
  const levelCounts: Record<string, number> = {};
  for (const p of profilesWithSections) {
    levelCounts[p.level] = (levelCounts[p.level] || 0) + 1;
  }
  console.log('Profiles with sections by level:', levelCounts);

  // 6. Inspect some profiles with sections but see why they might not link
  if (profilesWithSections.length > 0) {
    console.log('Sample profiles with sections:', profilesWithSections.slice(0, 5));
  }

  // 7. Check if there are orphans or broken relationships (where profileId doesn't exist anymore or majorId doesn't exist)
  const sectionsWithInvalidProfile = await prisma.majorContentSection.findMany({
    where: {
      profileId: { not: null },
      profile: isNull()
    } as any,
    select: { id: true, profileId: true }
  }).catch(() => []);
  console.log(`Sections with invalid profileId (orphans): ${sectionsWithInvalidProfile.length}`);

  console.log('--- DIAGNOSTIC END ---');
}

function isNull() {
  return null;
}

run().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
