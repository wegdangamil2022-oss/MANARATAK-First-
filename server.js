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

// Serve static assets with cache headers
if (fs.existsSync(distPath)) {
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
    res.status(200).send('MANARATAK Platform is initializing. Please build web assets.');
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[MANARATAK Production Server] running on http://0.0.0.0:${PORT}`);
});
