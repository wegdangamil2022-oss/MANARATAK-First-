import { PrismaClient } from '@prisma/client';
import { Phase10CatalogRepository } from '../packages/infrastructure/src/majors/Phase10CatalogRepository';
import { AdminMajorUseCases } from '../packages/application/src/majors/use-cases/AdminMajorUseCases';

async function main() {
  const prisma = new PrismaClient();
  const repo = new Phase10CatalogRepository(prisma);
  const useCase = new AdminMajorUseCases(null as any, repo); // We mock repository for normal list

  const resAll = await useCase.listMajors({ catalog: 'true', page: 1, pageSize: 10000 });
  console.log(`All: ${resAll.total}`);

  const bachelors = await useCase.listMajors({ catalog: 'true', degreeLevel: 'BACHELOR', page: 1, pageSize: 10000 });
  const masters = await useCase.listMajors({ catalog: 'true', degreeLevel: 'MASTER', page: 1, pageSize: 10000 });
  const doctorates = await useCase.listMajors({ catalog: 'true', degreeLevel: 'DOCTORATE', page: 1, pageSize: 10000 });
  const fellowships = await useCase.listMajors({ catalog: 'true', degreeLevel: 'FELLOWSHIP', page: 1, pageSize: 10000 });

  console.log(`Bachelor: ${bachelors.total}`);
  console.log(`Master: ${masters.total}`);
  console.log(`Doctorate: ${doctorates.total}`);
  console.log(`Fellowship: ${fellowships.total}`);

  await prisma.$disconnect();
}

main().catch(console.error);
