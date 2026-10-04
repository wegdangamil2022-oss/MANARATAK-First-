import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync, spawn } from 'node:child_process';
import net from 'node:net';
import http from 'node:http';
import { build, createServer, loadEnv } from 'vite';
import { applyStudioRuntimeDefaults } from './runtime-defaults.mjs';

function checkPortInUse(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(400);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

function checkAdminHttpReady(port = 3001) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/admin/`, { timeout: 1000 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function terminateChild(proc, timeoutMs = 5000) {
  if (!proc || proc.exitCode !== null) return;
  try {
    proc.kill('SIGTERM');
  } catch {}
  const deadline = Date.now() + timeoutMs;
  while (proc.exitCode === null && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (proc.exitCode === null) {
    try {
      proc.kill('SIGKILL');
    } catch {}
  }
}

async function waitForAdminReady(procState, timeoutMs = 25000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (procState.exited || procState.error) {
      const detail = procState.error
        ? procState.error.message
        : `exited prematurely with code ${procState.exitCode ?? 'null'}, signal ${procState.exitSignal ?? 'none'}`;
      throw new Error(`Admin process terminated during startup: ${detail}`);
    }
    const isReady = await checkAdminHttpReady(3001);
    if (isReady) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Admin service on port 3001 did not become ready within ${timeoutMs}ms.`);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [app = 'web', command = 'dev', ...args] = process.argv.slice(2);
if (!['web', 'admin'].includes(app) || !['dev', 'build'].includes(command)) {
  throw new Error('Use: node scripts/aistudio/run.mjs web|admin dev|build [--port 3000]');
}
const env = loadEnv('aistudio', root, ['MANARATAK_', 'VITE_', 'DISABLE_HMR']);
for (const [key, value] of Object.entries(env)) process.env[key] ??= value;
process.env.MANARATAK_GOOGLE_AI_STUDIO = 'true';
process.env.MANARATAK_RUNTIME_PROFILE = 'google-ai-studio';
if (!process.env.DATABASE_URL && process.env.SQL_HOST && process.env.SQL_DB_NAME) {
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

// Build commands must not start local services.
if (command === 'dev') {
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
}

process.env.REDIS_NAMESPACE ??= 'manaratak:';
process.env.EMAIL_DELIVERY_PROVIDER ??= existsSync('/usr/local/bin/mailpit') ? 'smtp' : 'captured';
process.env.SMTP_HOST ??= '127.0.0.1';
process.env.SMTP_PORT ??= '1025';
process.env.SMTP_SECURE ??= 'false';
process.env.SMTP_FROM ??= 'noreply@manaratak.local';
applyStudioRuntimeDefaults(process.env);

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
  let adminProc = null;
  if (app === 'web') {
    const adminPortBusy = await checkPortInUse(3001);
    if (adminPortBusy) {
      console.error('[run.mjs] Error: Port 3001 is already in use by an existing process. Existing process was left untouched.');
      await server.close();
      process.exit(1);
    }

    console.log('[run.mjs] Spawning background admin dev server on port 3001...');
    const adminScript = fileURLToPath(import.meta.url);
    const procState = {
      exited: false,
      exitCode: null,
      exitSignal: null,
      error: null,
    };

    adminProc = spawn(process.execPath, [adminScript, 'admin', 'dev'], {
      stdio: 'inherit',
      cwd: root,
      env: process.env,
    });

    adminProc.on('error', (err) => {
      procState.error = err;
    });
    adminProc.on('exit', (code, signal) => {
      procState.exited = true;
      procState.exitCode = code;
      procState.exitSignal = signal;
    });

    try {
      await waitForAdminReady(procState, 25000);
    } catch (err) {
      console.error('[run.mjs] Admin startup failed:', err.message);
      await terminateChild(adminProc, 5000);
      await server.close();
      process.exit(1);
    }
  }

  console.log('AI_STUDIO_WEB_ONLY: frontend preview ready.');

  let isClosing = false;
  const gracefulShutdown = async (exitCode = 0) => {
    if (isClosing) return;
    isClosing = true;
    if (adminProc) {
      await terminateChild(adminProc, 5000);
    }
    try {
      await server.close();
    } catch {}
    process.exit(exitCode);
  };

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, async () => {
      await gracefulShutdown(0);
    });
  }
}
