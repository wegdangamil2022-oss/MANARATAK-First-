import { PrismaClient } from '@prisma/client';
import { Phase10CatalogRepository } from '../packages/infrastructure/src/majors/Phase10CatalogRepository';

async function main() {
  const prisma = new PrismaClient();
  const repo = new Phase10CatalogRepository(prisma);

  const resAll = await repo.listCatalog({ page: 1, pageSize: 10000 });
  const allCount = resAll.total;

  const bachelors = await repo.listCatalog({ degreeLevel: 'BACHELOR', page: 1, pageSize: 10000 });
  const masters = await repo.listCatalog({ degreeLevel: 'MASTER', page: 1, pageSize: 10000 });
  const doctorates = await repo.listCatalog({ degreeLevel: 'DOCTORATE', page: 1, pageSize: 10000 });
  const fellowships = await repo.listCatalog({ degreeLevel: 'FELLOWSHIP', page: 1, pageSize: 10000 });

  console.log(`All: ${allCount}`);
  console.log(`Bachelor: ${bachelors.total}`);
  console.log(`Master: ${masters.total}`);
  console.log(`Doctorate: ${doctorates.total}`);
  console.log(`Fellowship: ${fellowships.total}`);

  // Test representative records
  const codes = [
    'MJR-0001', 'MJR-0843', 'MAS-0001', 'MAS-1116',
    'DOC-0001', 'DOC-1114', 'FEL-0001', 'FEL-0329'
  ];

  for (const code of codes) {
    const item = resAll.data.find(x => x.code === code);
    if (!item) {
      console.log(`❌ Missing: ${code}`);
    } else {
      console.log(`✅ Found ${code}: AR="${item.nameAr}", EN="${item.nameEn}", Level="${item.degreeLevel}"`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
