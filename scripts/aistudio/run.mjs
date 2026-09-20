import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, createServer, loadEnv } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [app = 'web', command = 'dev', ...args] = process.argv.slice(2);
if (!['web', 'admin'].includes(app) || !['dev', 'build'].includes(command)) {
  throw new Error('Use: node scripts/aistudio/run.mjs web|admin dev|build [--port 3000]');
}
const env = loadEnv('aistudio', root, ['MANARATAK_', 'VITE_', 'DISABLE_HMR']);
for (const [key, value] of Object.entries(env)) process.env[key] ??= value;
process.env.MANARATAK_GOOGLE_AI_STUDIO = 'true';
process.env.MANARATAK_RUNTIME_PROFILE = 'google-ai-studio';
const configFile = path.join(root, 'apps', app, 'vite.config.ts');
if (command === 'build') {
  await build({ configFile, root: path.join(root, 'apps', app), mode: 'aistudio' });
} else {
  const portIndex = args.indexOf('--port');
  const port = portIndex >= 0 ? Number(args[portIndex + 1]) : app === 'web' ? 3000 : 3001;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid preview port');
  const server = await createServer({
    configFile, root: path.join(root, 'apps', app), mode: 'aistudio',
    server: { host: '0.0.0.0', port, strictPort: true },
  });
  await server.listen();
  server.printUrls();
  console.log('AI_STUDIO_WEB_ONLY: frontend preview ready.');
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, async () => { await server.close(); process.exit(0); });
  }
}
