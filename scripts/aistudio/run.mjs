import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync, spawn } from 'node:child_process';
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
if (process.env.SQL_HOST && process.env.SQL_DB_NAME) {
  // Ensure Cloud SQL Unix domain socket is available if using proxy directory
  if (process.env.SQL_HOST.startsWith('/app/cloudsql')) {
    const socketPath = path.join(process.env.SQL_HOST, '.s.PGSQL.5432');
    for (let i = 0; i < 20; i++) {
      if (existsSync(socketPath)) break;
      try { execSync('sleep 0.25'); } catch {}
    }
  }

  const user = process.env.SQL_USER || process.env.SQL_ADMIN_USER || process.env.DB_APPLICATION_ROLE || 'ai_studio_app_user';
  const rawPass = process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || process.env.DB_APPLICATION_PASSWORD || '';
  const pass = encodeURIComponent(rawPass);
  const host = encodeURIComponent(process.env.SQL_HOST);
  const db = encodeURIComponent(process.env.SQL_DB_NAME);
  process.env.DATABASE_URL = `postgresql://${user}:${pass}@localhost/${db}?host=${host}`;
}

// Ensure redis-server and mailpit are running if present in development runtime
let redisOnline = false;
try {
  const hasRedisCli = existsSync('/usr/bin/redis-cli') || existsSync('/usr/local/bin/redis-cli');
  if (hasRedisCli) {
    try {
      execSync('redis-cli ping', { stdio: 'ignore' });
      redisOnline = true;
    } catch {
      const hasRedisServer = existsSync('/usr/bin/redis-server') || existsSync('/usr/local/bin/redis-server');
      if (hasRedisServer) {
        try {
          execSync('redis-server --daemonize yes', { stdio: 'ignore' });
          redisOnline = true;
        } catch {
          // Optional in preview environment
        }
      }
    }
  }
} catch {
  // Redis is optional in development preview
}

if (redisOnline) {
  process.env.REDIS_URL ??= 'redis://127.0.0.1:6379';
} else {
  delete process.env.REDIS_URL;
}

if (existsSync('/usr/local/bin/mailpit')) {
  try {
    const mailpitRunning = execSync('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8025/mailpit/ || true').toString().trim();
    if (mailpitRunning !== '200') {
      const mp = spawn('/usr/local/bin/mailpit', [
        '--listen', '127.0.0.1:8025',
        '--smtp', '127.0.0.1:1025',
        '--webroot', '/mailpit/'
      ], { detached: true, stdio: 'ignore' });
      mp.on('error', (e) => {
        console.warn('[run.mjs] Failed to start mailpit process:', e.message);
      });
      mp.unref();
    }
  } catch (e) {
    console.warn('[run.mjs] Failed to start mailpit:', e.message);
  }
}

process.env.REDIS_NAMESPACE ??= 'manaratak:';
process.env.EMAIL_DELIVERY_PROVIDER ??= existsSync('/usr/local/bin/mailpit') ? 'smtp' : 'captured';
process.env.SMTP_HOST ??= '127.0.0.1';
process.env.SMTP_PORT ??= '1025';
process.env.SMTP_SECURE ??= 'false';
process.env.SMTP_FROM ??= 'noreply@manaratak.local';
const defaultAppUrl = process.env.APP_URL || 'https://ais-dev-od32bh2xe2bbyy3pd7iezd-969897993292.europe-west2.run.app';
process.env.PUBLIC_WEB_URL ??= defaultAppUrl;
process.env.VITE_PUBLIC_WEB_URL ??= defaultAppUrl;
process.env.ACCESS_TOKEN_TTL_SECONDS ??= '604800'; // 7 days persistent admin session
process.env.SESSION_TTL_SECONDS ??= '2592000'; // 30 days persistent session

process.on('unhandledRejection', (reason) => {
  console.warn('[run.mjs unhandledRejection]', reason instanceof Error ? reason.message : reason);
});
process.on('uncaughtException', (err) => {
  console.error('[run.mjs uncaughtException]', err.message);
});

const configFile = path.join(root, 'apps', app, 'vite.config.ts');
if (command === 'build') {
  await build({ configFile, root: path.join(root, 'apps', app), mode: 'aistudio' });
} else {
  const portIndex = args.indexOf('--port');
  const port = portIndex >= 0 ? Number(args[portIndex + 1]) : app === 'web' ? 3000 : 3001;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid preview port');
  const server = await createServer({
    configFile, root: path.join(root, 'apps', app), mode: 'aistudio',
    server: {
      host: '0.0.0.0',
      port,
      strictPort: true,
      proxy: {
        '/mailpit': {
          target: 'http://127.0.0.1:8025',
          changeOrigin: true,
          ws: true,
        },
      },
    },
  });
  await server.listen();
  server.printUrls();
  if (app === 'web') {
    console.log('[run.mjs] Spawning background admin dev server on port 3001...');
    const adminProc = spawn('node', ['scripts/aistudio/run.mjs', 'admin', 'dev'], {
      detached: true,
      stdio: 'ignore',
      cwd: root
    });
    adminProc.unref();
  }
  console.log('AI_STUDIO_WEB_ONLY: frontend preview ready.');
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, async () => { await server.close(); process.exit(0); });
  }
}
