import {staticScriptEntries} from './StaticScriptPolicy.mjs';
import { READINESS_PATH, requireSha } from './ReleaseContracts.mjs';
export function unitUrl(base, pathname = '') {
  const url = new URL(base);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
    throw new Error('SMOKE_ORIGIN_INVALID');
  const prefix = url.pathname.replace(/\/$/, '');
  if (pathname === READINESS_PATH && prefix && prefix !== '/api/v1')
    throw new Error('SMOKE_API_BASE_PATH_INVALID');
  url.pathname = pathname === READINESS_PATH ? READINESS_PATH : `${prefix}${pathname}`;
  return url.href;
}
export async function readBounded(response, maximum = 1_000_000) {
  if (!response.body) throw new Error('SMOKE_EMPTY_BODY');
  const reader = response.body.getReader();
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) throw new Error('SMOKE_BODY_TOO_LARGE');
      chunks.push(Buffer.from(value));
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks).toString('utf8');
}
async function response(url, fetcher) {
  const result = await fetcher(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  if (result.status !== 200 || result.redirected || (result.url && result.url !== url))
    throw new Error('SMOKE_HTTP_OR_REDIRECT_INVALID');
  return result;
}
export async function runSmoke({ api, web, admin, sha }, fetcher = fetch) {
  requireSha(sha);
  const health = await response(unitUrl(api, READINESS_PATH), fetcher);
  if (!health.headers.get('content-type')?.startsWith('application/json'))
    throw new Error('SMOKE_API_CONTENT_TYPE_INVALID');
  const body = JSON.parse(await readBounded(health, 16000));
  if (
    body.protocolVersion !== 2 ||
    body.status !== 'UP' ||
    body.code !== 'AVAILABLE' ||
    !Number.isFinite(Date.parse(body.timestamp)) ||
    Math.abs(Date.now() - Date.parse(body.timestamp)) > 60000 ||
    health.headers.get('x-manaratak-source-sha') !== sha
  )
    throw new Error('SMOKE_API_READINESS_OR_REVISION_INVALID');
  for (const [unit, base] of [
    ['web', web],
    ['admin', admin],
  ]) {
    const build = await response(unitUrl(base, '/health/build'), fetcher);
    if (!build.headers.get('content-type')?.startsWith('application/json'))
      throw new Error('SMOKE_BUILD_CONTENT_TYPE_INVALID');
    const descriptor = JSON.parse(await readBounded(build, 16000));
    if (
      descriptor.version !== 1 ||
      descriptor.status !== 'BUILT' ||
      descriptor.unit !== unit ||
      descriptor.sourceSha !== sha
    )
      throw new Error('SMOKE_BUILD_REVISION_INVALID');
    const root = await response(unitUrl(base, '/'), fetcher);
    if (!root.headers.get('content-type')?.startsWith('text/html'))
      throw new Error('SMOKE_HTML_CONTENT_TYPE_INVALID');
    const html = await readBounded(root);
    if (
      !html.includes(`<meta name="manaratak-build-sha" content="${sha}">`) ||
      !/id=["']root["']/.test(html) ||
      !/<script\b[^>]*src=["'][^"']+\.js(?:\?[^"']*)?["']/.test(html) ||
      /Platform is initializing|Please build web assets/i.test(html)
    )
      throw new Error('SMOKE_BUILT_HTML_INVALID');
    for(const entry of staticScriptEntries(html)) {
      const origin=new URL(unitUrl(base,'/')),scriptUrl=new URL(entry,origin);
      if(scriptUrl.origin!==origin.origin||!scriptUrl.pathname.startsWith(origin.pathname))
        throw new Error('SMOKE_SCRIPT_ORIGIN_OR_BASE_INVALID');
      const script=await response(scriptUrl.href,fetcher);
      if(!/^(?:application|text)\/(?:javascript|ecmascript)(?:;|$)/i.test(script.headers.get('content-type')??''))
        throw new Error('SMOKE_SCRIPT_CONTENT_TYPE_INVALID');
      const body=await readBounded(script,16_000_000);
      if(!body.trim()||/^\s*(?:<!doctype|<html)/i.test(body))throw new Error('SMOKE_SCRIPT_BODY_INVALID');
    }
  }
  return { status: 'PASS', sha, units: ['api', 'web', 'admin'] };
}
