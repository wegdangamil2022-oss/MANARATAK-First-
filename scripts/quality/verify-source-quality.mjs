#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baselinePath = path.join(repoRoot, 'scripts/quality/source-quality-baseline.json');
const writeBaseline = process.argv.includes('--write-baseline');

const normalize = (value) => value.split(path.sep).join('/');
const rel = (value) => normalize(path.relative(repoRoot, value));

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (['node_modules', 'dist', '.next', 'coverage', '.turbo'].includes(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (predicate(full)) out.push(full);
    }
  }
  return out;
}

function workspacePackages() {
  const packages = new Map();
  for (const rootName of ['apps', 'packages']) {
    const root = path.join(repoRoot, rootName);
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(root, entry.name, 'package.json');
      if (!fs.existsSync(manifestPath)) continue;
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.name) packages.set(manifest.name, path.dirname(manifestPath));
    }
  }
  return packages;
}

const IMPORT_RE = /\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;

function importSpecifiers(source) {
  const specs = [];
  for (const match of source.matchAll(IMPORT_RE)) specs.push(match[1] ?? match[2]);
  return specs.filter(Boolean);
}

function stronglyConnectedComponents(nodes, edges) {
  let index = 0;
  const stack = [];
  const onStack = new Set();
  const indexes = new Map();
  const lowLinks = new Map();
  const components = [];

  function visit(node) {
    indexes.set(node, index);
    lowLinks.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    for (const next of edges.get(node) ?? []) {
      if (!indexes.has(next)) {
        visit(next);
        lowLinks.set(node, Math.min(lowLinks.get(node), lowLinks.get(next)));
      } else if (onStack.has(next)) {
        lowLinks.set(node, Math.min(lowLinks.get(node), indexes.get(next)));
      }
    }

    if (lowLinks.get(node) === indexes.get(node)) {
      const component = [];
      while (stack.length) {
        const current = stack.pop();
        onStack.delete(current);
        component.push(current);
        if (current === node) break;
      }
      if (component.length > 1) components.push(component);
      else if ((edges.get(node) ?? new Set()).has(node)) components.push(component);
    }
  }

  for (const node of nodes) if (!indexes.has(node)) visit(node);
  return components;
}

function canonicalCycle(component) {
  return [...component].sort().join(' <-> ');
}

function resolveRelativeImport(sourceFile, specifier, sourceFiles) {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(sourceFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.cts`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.mts'),
    path.join(base, 'index.cts'),
  ];
  return candidates.find((candidate) => sourceFiles.has(path.normalize(candidate))) ?? null;
}

function collectCycleViolations() {
  const violations = [];
  const packages = workspacePackages();
  const packageEdges = new Map([...packages.keys()].map((name) => [name, new Set()]));
  const sourceFiles = new Set();
  const packageByFile = new Map();

  for (const [packageName, packageDir] of packages) {
    const files = walk(packageDir, (file) => /\.(?:ts|tsx|mts|cts)$/.test(file) && !/\.d\.ts$/.test(file));
    for (const file of files) {
      const normalized = path.normalize(file);
      sourceFiles.add(normalized);
      packageByFile.set(normalized, packageName);
    }
  }

  const fileEdges = new Map([...sourceFiles].map((file) => [file, new Set()]));

  for (const file of sourceFiles) {
    const source = fs.readFileSync(file, 'utf8');
    const owner = packageByFile.get(file);
    for (const specifier of importSpecifiers(source)) {
      if (specifier.startsWith('@manaratak/')) {
        const target = [...packages.keys()].find((name) => specifier === name || specifier.startsWith(`${name}/`));
        if (target && target !== owner) packageEdges.get(owner)?.add(target);
      }
      const relativeTarget = resolveRelativeImport(file, specifier, sourceFiles);
      if (relativeTarget) fileEdges.get(file)?.add(relativeTarget);
    }
  }

  for (const component of stronglyConnectedComponents([...packages.keys()], packageEdges)) {
    violations.push({
      kind: 'package-cycle',
      fingerprint: `package-cycle:${canonicalCycle(component)}`,
      detail: canonicalCycle(component),
    });
  }

  for (const component of stronglyConnectedComponents([...sourceFiles], fileEdges)) {
    const names = component.map(rel).sort();
    violations.push({
      kind: 'file-cycle',
      fingerprint: `file-cycle:${names.join(' <-> ')}`,
      detail: names.join(' <-> '),
    });
  }

  return violations;
}

function lineNumber(source, offset) {
  let line = 1;
  for (let i = 0; i < offset; i += 1) if (source.charCodeAt(i) === 10) line += 1;
  return line;
}

function hasAttr(attrs, name) {
  return new RegExp(`\\b${name}\\s*=`, 'i').test(attrs);
}

function collectAccessibilityViolations() {
  const violations = [];
  const roots = ['apps', 'packages'].map((name) => path.join(repoRoot, name));
  const files = roots.flatMap((root) => walk(root, (file) => file.endsWith('.tsx')));
  const tagRe = /<(img|iframe|a|div|span)\b([^<>]*?)\/?\s*>/gims;

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const duplicateCounter = new Map();
    const stableFingerprint = (kind, rawTag) => {
      const normalizedTag = rawTag.replace(/\s+/g, ' ').trim();
      const digest = crypto.createHash('sha256').update(normalizedTag).digest('hex').slice(0, 16);
      const key = `${kind}:${digest}`;
      const ordinal = (duplicateCounter.get(key) ?? 0) + 1;
      duplicateCounter.set(key, ordinal);
      return `${kind}:${rel(file)}:${digest}:${ordinal}`;
    };

    for (const match of source.matchAll(tagRe)) {
      const tag = match[1].toLowerCase();
      const attrs = match[2] ?? '';
      const line = lineNumber(source, match.index ?? 0);
      const location = `${rel(file)}:${line}`;
      const rawTag = match[0];

      if (tag === 'img' && !hasAttr(attrs, 'alt')) {
        violations.push({ kind: 'a11y-img-alt', fingerprint: stableFingerprint('a11y-img-alt', rawTag), detail: `${location} <img> requires alt` });
      }
      if (tag === 'iframe' && !hasAttr(attrs, 'title')) {
        violations.push({ kind: 'a11y-iframe-title', fingerprint: stableFingerprint('a11y-iframe-title', rawTag), detail: `${location} <iframe> requires title` });
      }
      if (tag === 'a' && /\bonClick\s*=/.test(attrs) && !hasAttr(attrs, 'href')) {
        violations.push({ kind: 'a11y-anchor-href', fingerprint: stableFingerprint('a11y-anchor-href', rawTag), detail: `${location} clickable <a> requires href` });
      }
      if ((tag === 'div' || tag === 'span') && /\bonClick\s*=/.test(attrs)) {
        const keyboard = /\bonKey(?:Down|Up|Press)\s*=/.test(attrs);
        const role = hasAttr(attrs, 'role');
        const tabIndex = hasAttr(attrs, 'tabIndex');
        if (!(keyboard && role && tabIndex)) {
          violations.push({
            kind: 'a11y-click-keyboard',
            fingerprint: stableFingerprint('a11y-click-keyboard', rawTag),
            detail: `${location} clickable <${tag}> requires role, tabIndex, and keyboard handler`,
          });
        }
      }
    }
  }

  return violations;
}

const violations = [...collectCycleViolations(), ...collectAccessibilityViolations()]
  .sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));
const fingerprints = violations.map((item) => item.fingerprint);

if (writeBaseline) {
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    policy: 'Existing debt is explicitly baselined; CI rejects any new package/file cycles or covered JSX accessibility violations. Baseline entries must be removed when the underlying debt is remediated.',
    fingerprints,
  };
  fs.writeFileSync(baselinePath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`SOURCE_QUALITY_BASELINE_WRITTEN=${fingerprints.length}`);
  for (const violation of violations) console.log(`BASELINED ${violation.kind} ${violation.detail}`);
  process.exit(0);
}

if (!fs.existsSync(baselinePath)) {
  console.error(`Missing baseline: ${rel(baselinePath)}. Review current findings and run with --write-baseline only when intentionally freezing known debt.`);
  process.exit(2);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const baselineSet = new Set(Array.isArray(baseline.fingerprints) ? baseline.fingerprints : []);
const currentSet = new Set(fingerprints);
const newViolations = violations.filter((item) => !baselineSet.has(item.fingerprint));
const resolvedBaseline = [...baselineSet].filter((item) => !currentSet.has(item));

const packageCycles = violations.filter((item) => item.kind === 'package-cycle').length;
const fileCycles = violations.filter((item) => item.kind === 'file-cycle').length;
const a11y = violations.length - packageCycles - fileCycles;

console.log(`SOURCE_QUALITY_PACKAGE_CYCLES=${packageCycles}`);
console.log(`SOURCE_QUALITY_FILE_CYCLES=${fileCycles}`);
console.log(`SOURCE_QUALITY_A11Y_FINDINGS=${a11y}`);
console.log(`SOURCE_QUALITY_BASELINED_TOTAL=${violations.length - newViolations.length}`);
console.log(`SOURCE_QUALITY_RESOLVED_BASELINE=${resolvedBaseline.length}`);

if (resolvedBaseline.length) {
  console.log('Resolved baseline entries (remove them with a reviewed baseline update):');
  for (const item of resolvedBaseline) console.log(`  RESOLVED ${item}`);
}

if (newViolations.length) {
  console.error(`SOURCE_QUALITY_NEW_VIOLATIONS=${newViolations.length}`);
  for (const violation of newViolations) console.error(`  NEW ${violation.kind} ${violation.detail}`);
  process.exit(1);
}

console.log('SOURCE_QUALITY_GATE=PASS');
