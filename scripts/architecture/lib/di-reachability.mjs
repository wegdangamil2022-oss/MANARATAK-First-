import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript/lib/typescript.js');

const CONTAINER = 'apps/api/src/infrastructure/di/container.ts';

function walkTs(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTs(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full.replaceAll('\\', '/'));
  }
  return out;
}

function word(name) {
  return new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
}

export function analyzeDiReachability(root = process.cwd()) {
  const containerPath = path.join(root, CONTAINER);
  const source = fs.readFileSync(containerPath, 'utf8');
  const sf = ts.createSourceFile(containerPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let registerObject;
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'register' &&
      node.arguments[0] &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) registerObject = node.arguments[0];
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (!registerObject) throw new Error('DI_REGISTER_OBJECT_NOT_FOUND');

  const propertyText = new Map();
  for (const prop of registerObject.properties) {
    const name = prop.name?.getText(sf).replace(/^['"]|['"]$/g, '');
    if (name) propertyText.set(name, prop.getText(sf));
  }
  const keys = [...propertyText.keys()].sort();
  const dependencies = new Map();
  for (const [key, text] of propertyText.entries()) {
    dependencies.set(key, keys.filter((candidate) => candidate !== key && word(candidate).test(text)).sort());
  }

  const runtimeFiles = walkTs(path.join(root, 'apps/api/src'))
    .map((absolute) => path.relative(root, absolute).replaceAll('\\', '/'))
    .filter((relative) => relative !== CONTAINER && !relative.includes('/tests/'));
  const runtimeTexts = new Map(runtimeFiles.map((relative) => [relative, fs.readFileSync(path.join(root, relative), 'utf8')]));
  const consumers = new Map();
  for (const key of keys) {
    consumers.set(key, runtimeFiles.filter((file) => word(key).test(runtimeTexts.get(file))).sort());
  }

  const reachable = new Set(keys.filter((key) => consumers.get(key).length > 0));
  let changed = true;
  while (changed) {
    changed = false;
    for (const key of [...reachable]) {
      for (const dependency of dependencies.get(key) ?? []) {
        if (!reachable.has(dependency)) {
          reachable.add(dependency);
          changed = true;
        }
      }
    }
  }

  const reverseDependencies = new Map(keys.map((key) => [key, []]));
  for (const [parent, deps] of dependencies.entries()) {
    for (const dependency of deps) reverseDependencies.get(dependency)?.push(parent);
  }

  const registrations = keys.map((name) => ({
    name,
    classification: reachable.has(name) ? 'RUNTIME_REACHABLE' : 'REMOVE',
    directRuntimeConsumers: consumers.get(name),
    reachableThroughRegistrations: (reverseDependencies.get(name) ?? []).filter((parent) => reachable.has(parent)).sort(),
    dependencies: dependencies.get(name) ?? [],
  }));
  return {
    container: CONTAINER,
    registrationCount: registrations.length,
    reachableCount: registrations.filter((entry) => entry.classification === 'RUNTIME_REACHABLE').length,
    unreachable: registrations.filter((entry) => entry.classification !== 'RUNTIME_REACHABLE').map((entry) => entry.name),
    registrations,
  };
}
