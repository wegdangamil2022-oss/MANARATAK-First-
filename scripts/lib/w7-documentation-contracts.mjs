import path from 'node:path';

export const PRODUCTION_READY_STATUS_RE = /(?:\*\*)?(?:Current Status|Status|Decision)(?:\*\*)?\s*:[^\n]{0,160}\bProduction[ -]Ready\b/i;

export function findProductionReadyStatusClaims(entries) {
  const findings = [];
  for (const { file, text } of entries) {
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (PRODUCTION_READY_STATUS_RE.test(line)) findings.push({ file, line: index + 1, text: line.trim() });
    });
  }
  return findings;
}

export function parseComposeServiceNames(text) {
  const lines = text.split(/\r?\n/);
  const names = [];
  let inServices = false;
  for (const line of lines) {
    if (/^services:\s*$/.test(line)) { inServices = true; continue; }
    if (!inServices) continue;
    if (/^[^\s#][^:]*:\s*$/.test(line)) break;
    const match = line.match(/^  ([A-Za-z0-9][A-Za-z0-9_-]*):\s*$/);
    if (match) names.push(match[1]);
  }
  return names.sort();
}

export function extractDeclaredComposeServices(text) {
  const section = text.match(/contains exactly:\s*\n([\s\S]*?)(?:\n\n|\nThere are)/i)?.[1] ?? '';
  return [...section.matchAll(/^- `([^`]+)`\s*$/gm)].map((m) => m[1]).sort();
}

export function extractOperationalPaths(text) {
  const paths = new Set();
  for (const match of text.matchAll(/`((?:scripts|docs|\.github)\/[A-Za-z0-9_./-]+|docker-compose\.yml|package\.json)`/g)) {
    paths.add(match[1].replace(/[.,;:]$/, ''));
  }
  return [...paths].sort();
}

export function hasRebaselineOpenStatusRows(text) {
  return text.split(/\r?\n/).some((line) => /^\|/.test(line) && /\|\s*Rebaseline Open\s*\|/.test(line));
}

export function resolveDocLink(root, documentPath, href) {
  if (/^(?:https?:|mailto:|#)/.test(href)) return null;
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return null;
  return path.resolve(path.dirname(documentPath), clean);
}
