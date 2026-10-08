import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const manifestPath = 'docs/remediation/evidence/section-02/admin-mutation-audit-inventory.json';
const parse = (name, source) => ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true);
const visit = (node, callback) => { callback(node); ts.forEachChild(node, child => visit(child, callback)); };
const literal = node => node && ts.isStringLiteralLike(node) ? node.text : null;

export function buildAuditInventory({ appSource, containerSource, routerSources, policySource }) {
  const app = parse('app.ts', appSource);
  const container = parse('container.ts', containerSource);
  const bindings = new Map();
  visit(container, node => {
    if (!ts.isPropertyAssignment(node)) return;
    const classes = [];
    visit(node.initializer, child => {
      if (ts.isCallExpression(child) && ts.isPropertyAccessExpression(child.expression)
          && child.expression.name.text === 'create' && ts.isIdentifier(child.expression.expression)
          && child.expression.expression.text.endsWith('Router')) classes.push(child.expression.expression.text);
    });
    if (classes.length === 1) bindings.set(node.name.getText(container).replace(/['"]/g, ''), classes[0]);
  });
  const policyAst = parse('policy.ts', policySource);
  const policyClass = policyAst.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'MutationAuditPolicy');
  if (!policyClass) throw new Error('AUDIT_POLICY_NOT_FOUND');
  const compiled = ts.transpileModule(policyClass.getText(policyAst), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const sandbox = { exports: {} };
  vm.runInNewContext(compiled, sandbox, { timeout: 1000 });
  const classify = sandbox.exports.MutationAuditPolicy.classify.bind(sandbox.exports.MutationAuditPolicy);
  const mounts = [];
  visit(app, node => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.expression.getText(app) === 'v1Router'
      && ['post', 'put', 'patch', 'delete'].includes(node.expression.name.text)
      && literal(node.arguments[0])?.startsWith('/admin'))
      throw new Error('DIRECT_ADMIN_MUTATION_REQUIRES_REVIEW');
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)
      || node.expression.expression.getText(app) !== 'v1Router' || node.expression.name.text !== 'use') return;
    const prefix = literal(node.arguments[0]);
    if (!prefix?.startsWith('/admin/')) return;
    let owner;
    const permissions = [];
    visit(node, child => {
      if (!ts.isCallExpression(child)) return;
      const name = child.expression.getText(app);
      if (name === 'requireAdminPermission') permissions.push(literal(child.arguments[0]));
      if (name === 'lazyRouter' || /container\.resolve$/.test(name)) owner = bindings.get(literal(child.arguments[0]));
      if (ts.isPropertyAccessExpression(child.expression) && child.expression.name.text === 'create'
        && ts.isIdentifier(child.expression.expression) && child.expression.expression.text.endsWith('Router')) owner = child.expression.expression.text;
    });
    if (!owner) throw new Error(`ADMIN_ROUTER_BINDING_UNRESOLVED:${prefix}`);
    mounts.push({ prefix, owner, permissions: permissions.filter(Boolean) });
  });
  const output = [];
  for (const mount of mounts) {
    const source = routerSources[`${mount.owner}.ts`];
    if (!source) throw new Error(`ADMIN_ROUTER_SOURCE_UNRESOLVED:${mount.owner}`);
    const ast = parse(`${mount.owner}.ts`, source);
    const routerNames = new Set(['router']);
    visit(ast, node => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer
        && ts.isCallExpression(node.initializer) && /(^|\.)Router$/.test(node.initializer.expression.getText(ast)))
        routerNames.add(node.name.text);
    });
    visit(ast, node => {
      if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)
        || !['post', 'put', 'patch', 'delete'].includes(node.expression.name.text)) return;
      if (ts.isCallExpression(node.expression.expression) && /\.route$/.test(node.expression.expression.expression.getText(ast)))
        throw new Error('CHAINED_ADMIN_ROUTE_REQUIRES_REVIEW');
      if (!routerNames.has(node.expression.expression.getText(ast))) return;
      const route = literal(node.arguments[0]);
      if (!route) throw new Error(`ADMIN_DYNAMIC_ROUTE_REQUIRES_REVIEW:${mount.owner}`);
      const method = node.expression.name.text.toUpperCase();
      const fullPath = mount.prefix + (route === '/' ? '' : route);
      const text = node.getText(ast);
      const inlinePermissions = [...text.matchAll(/['"](admin:[a-z0-9:*_-]+)['"]/g)].map(match => match[1]);
      const permissionEvidence = [...new Set([...mount.permissions, ...inlinePermissions])];
      // A conditional per-route guard is recorded explicitly, rather than claiming
      // that a class-wide evaluator import proves the authorization of every route.
      const conditional = /\b(permit|transitionPermission|requireSupportMutation)\b/.test(text);
      const validation = /\.(safeParse|parse)\s*\(|\bparseStrict\s*\(/.test(text)
        ? 'DIRECT_API_PARSE' : 'OWNER_OR_HANDLER_VERIFICATION_REQUIRED';
      const classification = classify({ method, originalUrl: `/api/v1${fullPath}` }, 'ADMIN');
      output.push({ method, path: fullPath, owner: mount.owner,
        classification,
        permissionEvidence, conditionalPermissionReview: conditional,
        validationEvidence: validation, idempotency: method === 'DELETE' ? 'DELETE_SEMANTICS_OWNER_VERIFICATION_REQUIRED' : 'GLOBAL_ADMIN_REQUIRED',
        auditEvidence: classification === 'NO_AUDIT_REQUIRED' ? 'REVIEWED_NON_MUTATING_POST_EXEMPTION' : 'REQUEST_INTENT_AND_BEST_EFFORT_HTTP_OUTCOME',
        atomicBusinessAudit: 'OWNER_VERIFICATION_REQUIRED', atomicOutbox: 'OWNER_VERIFICATION_REQUIRED',
        source: `apps/api/src/presentation/api/router/${mount.owner}.ts`,
      });
    });
  }
  return output.sort((a, b) => `${a.path}:${a.method}`.localeCompare(`${b.path}:${b.method}`));
}

export function checkGlobalAuditBoundaries(source) {
  const ast = parse('app.ts', source);
  let audit = -1;
  let idempotency = -1;
  let auth = -1;
  let firstMount = Infinity;
  visit(ast, node => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)
      || node.expression.expression.getText(ast) !== 'v1Router' || node.expression.name.text !== 'use') return;
    const prefix = literal(node.arguments[0]);
    if (prefix?.startsWith('/admin/')) firstMount = Math.min(firstMount, node.pos);
    if (prefix !== '/admin') return;
    const text = node.arguments.slice(1).map(argument => argument.getText(ast)).join(' ');
    if (/new MutationAuditMiddleware\([^)]*,\s*'ADMIN'\)/.test(text)) audit = node.pos;
    if (/createCanonicalIdempotencyMiddleware/.test(text) && /requireKey:\s*true/.test(text)) idempotency = node.pos;
    if (/SecurityMiddlewareFactory\.createAdminGuard/.test(text)) auth = node.pos;
  });
  return auth >= 0 && idempotency > auth && audit > idempotency && audit < firstMount
    ? [] : ['GLOBAL_ADMIN_AUTH_AUDIT_OR_IDEMPOTENCY_BOUNDARY_MISSING'];
}

export function checkAuditInventory(actual, approved) {
  const errors = [];
  const key = row => `${row.method} ${row.path} @${row.owner}`;
  const old = new Map(approved.map(row => [key(row), row]));
  const seen = new Set();
  for (const row of actual) {
    const id = key(row);
    if (seen.has(id)) errors.push(`DUPLICATE_ROUTE:${id}`);
    seen.add(id);
    if (!old.has(id)) errors.push(`UNREVIEWED_MUTATION:${id}`);
    else if (JSON.stringify(old.get(id)) !== JSON.stringify(row)) errors.push(`AUDIT_CONTRACT_CHANGED:${id}`);
  }
  for (const id of old.keys()) if (!seen.has(id)) errors.push(`REMOVED_MUTATION_REQUIRES_REVIEW:${id}`);
  return errors;
}

export function checkAuditRouteCollisions(actual, known = []) {
  const groups = new Map();
  for (const row of actual) {
    const key = `${row.method} ${row.path}`;
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key).add(row.owner);
  }
  const errors = [];
  for (const [key, owners] of groups) {
    if (owners.size < 2) continue;
    const review = known.find(row => `${row.method} ${row.path}` === key);
    if (!review || JSON.stringify([...owners].sort()) !== JSON.stringify([...review.owners].sort()))
      errors.push(`UNREVIEWED_ROUTE_COLLISION:${key}`);
  }
  return errors;
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const read = name => fs.readFileSync(path.join(root, name), 'utf8');
  const appSource = read('apps/api/src/app.ts');
  const directory = 'apps/api/src/presentation/api/router';
  const routerSources = Object.fromEntries(fs.readdirSync(directory).filter(name => name.endsWith('Router.ts'))
    .map(name => [name, read(`${directory}/${name}`)]));
  const inventory = buildAuditInventory({ appSource, containerSource: read('apps/api/src/infrastructure/di/container.ts'), routerSources,
    policySource: read('apps/api/src/presentation/audit/MutationAuditMiddleware.ts') });
  const errors = checkGlobalAuditBoundaries(appSource);
  if (!fs.existsSync(manifestPath)) throw new Error('APPROVED_ADMIN_AUDIT_INVENTORY_MISSING');
  const approved = JSON.parse(read(manifestPath));
  errors.push(...checkAuditInventory(inventory, approved.routes));
  errors.push(...checkAuditRouteCollisions(inventory, approved.knownRouteCollisions));
  for (const error of errors) console.error(error);
  const endpoints = new Set(inventory.map(row => `${row.method} ${row.path}`)).size;
  console.log(`ADMIN_MUTATION_AUDIT_COVERAGE=${errors.length ? 'FAIL' : 'PASS'}; handlers=${inventory.length}; uniqueEndpoints=${endpoints}; owner validation/atomic adoption requires separate evidence`);
  process.exitCode = errors.length ? 1 : 0;
}
