#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractDeclaredComposeServices, extractOperationalPaths, parseComposeServiceNames } from './lib/w7-documentation-contracts.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const manual = read('docs/operations/containerization-and-ci.md');
const compose = read('docker-compose.yml');

const missing = extractOperationalPaths(manual).filter((rel) => !fs.existsSync(path.join(root, rel)));
if (missing.length) {
  console.error(`OPERATIONS_DOC_PATHS=FAIL missing=${missing.join(',')}`);
  process.exit(1);
}

const actual = parseComposeServiceNames(compose);
const declared = extractDeclaredComposeServices(manual);
if (JSON.stringify(actual) !== JSON.stringify(declared)) {
  console.error(`OPERATIONS_COMPOSE_SERVICE_CLAIMS=FAIL actual=${actual.join(',')} declared=${declared.join(',')}`);
  process.exit(1);
}

console.log(`OPERATIONS_DOC_PATHS=PASS ${extractOperationalPaths(manual).length}/${extractOperationalPaths(manual).length}`);
console.log(`OPERATIONS_COMPOSE_SERVICE_CLAIMS=PASS ${actual.join(',')}`);
