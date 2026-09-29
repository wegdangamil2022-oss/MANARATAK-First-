import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';

async function main() {
  // Register dependencies using the default configuration (which uses process.env)
  await registerDependencies();

  // Create a container scope to resolve scoped dependencies
  const scope = container.createScope();
  const worker = scope.resolve<any>('studentWorkspaceOutboxWorker');
  const prisma = scope.resolve<any>('prisma');

  const workerId = `manual-dispatch-${process.pid}`;

  try {
    console.log('[Outbox Dispatcher] Starting manual outbox dispatch...');
    
    console.log('[Outbox Dispatcher] Running identity outbox worker...');
    const identityResult = await worker.runIdentityOnce(`${workerId}-identity`);
    console.log('[Outbox Dispatcher] Identity Worker Result:', identityResult);

    console.log('[Outbox Dispatcher] Running role outbox worker...');
    const roleResult = await worker.runRoleOnce(`${workerId}-role`);
    console.log('[Outbox Dispatcher] Role Worker Result:', roleResult);

    console.log('[Outbox Dispatcher] Running learning outbox worker...');
    const learningResult = await worker.runLearningOnce(`${workerId}-learning`);
    console.log('[Outbox Dispatcher] Learning Worker Result:', learningResult);

    console.log('[Outbox Dispatcher] Outbox dispatch complete.');

  } catch (error) {
    console.error('[Outbox Dispatcher] Error during manual outbox dispatch:', error);
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

main();
