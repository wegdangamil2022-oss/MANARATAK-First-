import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const major = await prisma.major.findFirst({ where: { classificationCode: 'MAS-1116' } });
  console.dir(major, { depth: null });
  const profile = await prisma.majorLevelProfile.findFirst({ where: { code: 'MAS-1116' }, include: { contentSections: true } });
  console.log("sections:", profile?.contentSections.length);
  console.dir(profile, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
