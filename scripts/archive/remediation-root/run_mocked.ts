import { container } from './apps/api/src/di/container.ts';

const mockPrisma = {
  majorLevelProfile: { findMany: async () => [] },
  majorCatalogSection: { findMany: async () => [], count: async () => 0 },
  $disconnect: async () => {}
};

// We monkey patch container.resolve
const origResolve = container.resolve.bind(container);
container.resolve = (key: string) => {
  if (key === 'prisma') return mockPrisma;
  return origResolve(key);
};

console.log('Running final-validation-all...');
import('./final-validation-all.ts').then(() => {
  setTimeout(() => {
     console.log('Script execution finished');
     console.log('process.exitCode:', process.exitCode);
  }, 2000);
}).catch(console.error);

