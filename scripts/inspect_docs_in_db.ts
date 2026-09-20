import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';
import { PrismaClient } from '@prisma/client';

async function run() {
  registerDependencies();
  const prisma = container.resolve<PrismaClient>('prisma');
  
  // Count majors
  const totalMajors = await prisma.major.count();
  console.log('Total majors in DB:', totalMajors);
  
  // Count profiles
  const totalProfiles = await prisma.majorLevelProfile.count();
  console.log('Total profiles in DB:', totalProfiles);
  
  // Count level profiles by level
  const profileLevels = await prisma.majorLevelProfile.groupBy({
    by: ['level'],
    _count: true,
  });
  console.log('Profile counts by level:', profileLevels);
  
  const doctorateProfilesCount = await prisma.majorLevelProfile.count({
    where: { level: 'DOCTORATE' }
  });
  console.log('Total DOCTORATE profiles in DB:', doctorateProfilesCount);

  // Print a sample of 3 doctorate profiles and their parent majors
  const sampleDocs = await prisma.majorLevelProfile.findMany({
    where: { level: 'DOCTORATE' },
    take: 3,
    include: {
      major: true
    }
  });
  console.log('Sample Doctorate Profiles with Major:', JSON.stringify(sampleDocs, null, 2));

  const sectionsCount = await prisma.majorContentSection.count();
  console.log('Total MajorContentSection records in DB:', sectionsCount);

  await prisma.$disconnect();
}

run()
  .catch(e => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    
  });
