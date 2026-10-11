// Local reverse-proxy contract fixture: no database, providers or deployment.
// Build/provide a development nginx binary, then pass its absolute path.
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const binary = process.argv[2];
if (!binary?.startsWith('/')) throw new Error('Pass an absolute development nginx binary path');
const root = await mkdtemp(resolve(tmpdir(), 'p16-nginx-source-'));
let revision = 1;
const requests = [];
const api = createServer((req, res) => {
  const url = new URL(req.url, 'http://mock-owner');
  requests.push(url);
  res.setHeader('Cache-Control', 'private, no-store, must-revalidate');
  if (url.pathname === '/api/v1/public/cms/sitemap.xml') {
    res.setHeader('Content-Type', 'application/xml');
    res.end('<urlset><url><loc>https://manaratak.example/ar/news/fresh</loc></url></urlset>');
    return;
  }
  assert.equal(url.pathname, '/api/v1/public/cms/pages/http-resolve');
  const path = url.searchParams.get('path');
  if (path === '/ar/news/old') {
    res.statusCode = 308;
    res.setHeader('Location', '/ar/news/fresh');
    res.end();
    return;
  }
  if (path === '/ar/news/archived') {
    res.statusCode = 404;
    res.end('NOT_PUBLISHED');
    return;
  }
  if (path === '/ar/news/outage') {
    res.statusCode = 503;
    res.end('OWNER_UNAVAILABLE');
    return;
  }
  res.setHeader('Content-Type', 'text/html');
  res.end(`<html><title>Approved revision ${revision}</title></html>`);
});
await new Promise((done) => api.listen(0, '127.0.0.1', done));
const ownerPort = api.address().port;
const reservation = createServer();
await new Promise((done) => reservation.listen(0, '127.0.0.1', done));
const webPort = reservation.address().port;
await new Promise((done) => reservation.close(done));
let nginx;
try {
  await mkdir(resolve(root, 'logs'));
  await mkdir(resolve(root, 'ar/news/archived'), { recursive: true });
  await writeFile(resolve(root, 'index.html'), 'STALE_SPA_FALLBACK');
  await writeFile(resolve(root, 'cms-app-entry.js'), 'import("/assets/current.js");');
  await writeFile(resolve(root, 'ar/news/archived/index.html'), 'STALE_ARCHIVED_HTML');
  const source = await readFile(resolve('apps/web/nginx.conf'), 'utf8');
  const server = source
    .replace('listen 80;', `listen 127.0.0.1:${webPort};`)
    .replaceAll('api:3000', `127.0.0.1:${ownerPort}`)
    .replaceAll('/usr/share/nginx/html', root);
  const config = resolve(root, 'nginx.conf');
  await writeFile(
    config,
    `worker_processes 1; pid ${root}/nginx.pid; error_log ${root}/error.log;\nevents { worker_connections 128; }\nhttp { access_log off; client_body_temp_path ${root}/body; proxy_temp_path ${root}/proxy; ${server} }`,
  );
  const syntax = spawnSync(binary, ['-t', '-p', root, '-c', config], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
  console.log('PASS nginx source configuration syntax (mock host and port only)');
  nginx = spawn(binary, ['-p', root, '-c', config, '-g', 'daemon off;'], { stdio: 'ignore' });
  const web = `http://127.0.0.1:${webPort}`;
  let first;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      first = await fetch(`${web}/ar/news/fresh?path=/en/pages/forged&utm_source=fixture`);
      break;
    } catch {
      await new Promise((done) => setTimeout(done, 25));
    }
  }
  assert.ok(first, 'Local nginx did not start');
  assert.equal(first.status, 200);
  assert.match(await first.text(), /Approved revision 1/);
  assert.match(first.headers.get('cache-control'), /no-store/);
  assert.equal(requests[0].searchParams.get('path'), '/ar/news/fresh');
  assert.deepEqual([...requests[0].searchParams.keys()], ['path']);
  revision = 2;
  assert.match(await (await fetch(`${web}/ar/news/fresh`)).text(), /Approved revision 2/);
  console.log('PASS live owner HTML freshness and caller-query isolation');
  const archived = await fetch(`${web}/ar/news/archived`);
  assert.equal(archived.status, 404);
  assert.equal(await archived.text(), 'NOT_PUBLISHED');
  console.log('PASS archive 404 cannot serve stale prerender or SPA files');
  const redirect = await fetch(`${web}/ar/news/old`, { redirect: 'manual' });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), '/ar/news/fresh');
  console.log('PASS real HTTP canonical redirect');
  const sitemap = await fetch(`${web}/cms-sitemap.xml`);
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.headers.get('content-type'), /xml/);
  assert.match(await sitemap.text(), /urlset/);
  console.log('PASS authoritative CMS sitemap proxy');
  const outage = await fetch(`${web}/ar/news/outage`);
  assert.equal(outage.status, 503);
  assert.equal(await outage.text(), 'OWNER_UNAVAILABLE');
  console.log('PASS owner outage never serves a stale static success');
  const entry = await fetch(`${web}/cms-app-entry.js`);
  assert.equal(entry.status, 200);
  assert.match(entry.headers.get('content-type'), /javascript/);
  assert.match(entry.headers.get('cache-control'), /no-store/);
  assert.match(await entry.text(), /current\.js/);
  await rm(resolve(root, 'cms-app-entry.js'));
  const missingEntry = await fetch(`${web}/cms-app-entry.js`);
  assert.equal(missingEntry.status, 404);
  assert.doesNotMatch(await missingEntry.text(), /STALE_SPA_FALLBACK/);
  console.log('PASS web app entry has JavaScript MIME, no-store, and no SPA fallback');
  console.log('CHECKS=7 LOCAL_MOCK_OWNER=YES DATABASE_CONNECTED=NO DEPLOYMENT=NO');
} finally {
  if (nginx && nginx.exitCode === null) {
    const stopped = new Promise((done) => nginx.once('exit', done));
    nginx.kill('SIGTERM');
    await stopped;
  }
  await new Promise((done) => api.close(done));
  await rm(root, { recursive: true, force: true });
}
