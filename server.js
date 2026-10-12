import { inspectStaticBuild } from './scripts/release/lib/StaticBuildPolicy.mjs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Resolve candidate dist directories
const candidates = [
  path.resolve(__dirname, 'apps/web/dist'),
  path.resolve(__dirname, 'dist'),
];

const distPath = candidates.find(p => fs.existsSync(p)) || candidates[0];
const adminDistPath = path.resolve(__dirname, 'apps/admin/dist');

// Build health proves static artifact presence/revision only, not API or production readiness.
for (const [unit, route, directory] of [['web','/health/build',distPath],['admin','/admin/health/build',adminDistPath]]) {
  app.get(route, (_req,res) => { const result=inspectStaticBuild(directory,unit,process.env.RELEASE_SOURCE_SHA); res.setHeader('Cache-Control','no-store'); res.status(result.status==='BUILT'?200:503).json(result); });
}

// The Admin app has a separate Vite base and must be served before the Web SPA fallback.
if (fs.existsSync(path.join(adminDistPath, 'index.html'))) {
  app.use('/admin', express.static(adminDistPath, { maxAge: '1h' }));
  app.get('/admin/*', (_req, res) => {
    res.sendFile(path.join(adminDistPath, 'index.html'));
  });
} else {
  app.get(['/admin', '/admin/*'], (_req, res) => {
    res.status(503).send('Admin assets are not built.');
  });
}

// API routes require the API service or a reverse proxy, not the Web index page.
app.use('/api', (_req, res) => {
  res.status(503).json({ error: 'API_SERVICE_UNAVAILABLE' });
});

// Serve static assets with cache headers
if (fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));

  // SPA fallback route
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // If dist isn't built yet in local dev/testing
  app.get('*', (req, res) => {
    res.status(503).set('Cache-Control', 'no-store').send('WEB_BUILD_UNAVAILABLE');
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[MANARATAK Production Server] running on http://0.0.0.0:${PORT}`);
});
