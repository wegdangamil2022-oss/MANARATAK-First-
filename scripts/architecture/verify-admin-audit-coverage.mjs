import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = process.cwd();
const manifestPath = 'docs/remediation/evidence/section-02/admin-mutation-audit-inventory.json';
const parse = (name, source) => ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true);
const visit = (node, callback) => { callback(node); ts.forEachChild(node, child => visit(child, callback)); };
const literal = node => node && ts.isStringLiteralLike(node) ? node.text : null;

// Only resolve finite, lexically scoped Object.keys(const object) route loops.
// Arbitrary templates, runtime values, spreads and mutable registries stay rejected.
function staticRoutePaths(argument, call, ast) {
  const fixed = literal(argument);
  if (fixed !== null) return [fixed];
  if (!argument || !ts.isTemplateExpression(argument) || argument.templateSpans.length !== 1) return null;
  const span = argument.templateSpans[0];
  if (!ts.isIdentifier(span.expression)) return null;
  let loop = call.parent;
  while (loop && !ts.isForOfStatement(loop)) loop = loop.parent;
  if (!loop || !ts.isVariableDeclarationList(loop.initializer) || !(loop.initializer.flags & ts.NodeFlags.Const)) return null;
  const variable = loop.initializer.declarations;
  if (variable.length !== 1 || variable[0].name.getText(ast) !== span.expression.text) return null;
  let iterable = loop.expression;
  while (ts.isAsExpression(iterable) || ts.isParenthesizedExpression(iterable)) iterable = iterable.expression;
  if (ts.isArrayLiteralExpression(iterable)) {
    const values = iterable.elements.map(literal);
    if (!values.length || values.some(value => value === null || !/^[a-z][a-z0-9-]*$/.test(value)) || new Set(values).size !== values.length) return null;
    return values.map(value => argument.head.text + value + span.literal.text);
  }
  if (!ts.isCallExpression(iterable) || iterable.expression.getText(ast) !== 'Object.keys' || iterable.arguments.length !== 1 || !ts.isIdentifier(iterable.arguments[0])) return null;
  const registryName = iterable.arguments[0].text;
  const block = loop.parent;
  if (!ts.isBlock(block) && !ts.isSourceFile(block)) return null;
  const declarations = block.statements.filter(ts.isVariableStatement).flatMap(statement =>
    (statement.declarationList.flags & ts.NodeFlags.Const) ? [...statement.declarationList.declarations] : []);
  const declaration = declarations.find(node => node.pos < loop.pos && ts.isIdentifier(node.name) && node.name.text === registryName);
  if (!declaration?.initializer) return null;
  let registry = declaration.initializer;
  while (ts.isAsExpression(registry) || ts.isParenthesizedExpression(registry)) registry = registry.expression;
  if (!ts.isObjectLiteralExpression(registry) || !registry.properties.length) return null;
  const keys = [];
  for (const property of registry.properties) {
    if (!ts.isPropertyAssignment(property) || !(ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name)) || !ts.isStringLiteralLike(property.initializer)) return null;
    if (!/^[a-z][a-z0-9-]*$/.test(property.name.text) || keys.includes(property.name.text)) return null;
    keys.push(property.name.text);
  }
  // The registry may be consumed only as this loop's Object.keys input or
  // its indexed dispatch table. Passing it elsewhere permits hidden mutation.
  let safe = true;
  visit(block, node => {
    if (!ts.isIdentifier(node) || node.text !== registryName || node === declaration.name) return;
    if (node === iterable.arguments[0] || ts.isTypeQueryNode(node.parent)) return;
    if (ts.isElementAccessExpression(node.parent) && node.parent.expression === node && node.parent.argumentExpression?.getText(ast) === span.expression.text) {
      const access = node.parent;
      if (ts.isBinaryExpression(access.parent) && access.parent.left === access || ts.isDeleteExpression(access.parent) || ts.isPrefixUnaryExpression(access.parent) || ts.isPostfixUnaryExpression(access.parent)) safe = false;
      return;
    }
    safe = false;
  });
  return safe ? keys.map(key => argument.head.text + key + span.literal.text) : null;
}

export function buildAuditInventory({ appSource, containerSource, routerSources, policySource }) {
  const app = parse('app.ts', appSource);
  const container = parse('container.ts', containerSource);
  const factories = new Map();
  for (const declaration of app.statements) {
    if (!ts.isImportDeclaration(declaration) || !ts.isStringLiteral(declaration.moduleSpecifier)
      || declaration.importClause?.isTypeOnly) continue;
    const owner = declaration.moduleSpecifier.text.match(/^\.\/presentation\/api\/router\/([A-Z][A-Za-z0-9]*Router)\.js$/)?.[1];
    const imports = declaration.importClause?.namedBindings;
    if (!owner || !imports || !ts.isNamedImports(imports)) continue;
    for (const binding of imports.elements) {
      if (!binding.isTypeOnly && (binding.propertyName ?? binding.name).text === `create${owner}`)
        factories.set(binding.name.text, owner);
    }
  }
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
  const previewHelper = fs.readFileSync(path.join(root, 'apps/api/src/presentation/http/NotificationPreviewRequest.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(previewHelper, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox, { timeout: 1000 });
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
    // Recognize only directly mounted factories imported from their canonical
    // router module. A factory name or a nested dependency alone is not proof.
    for (const argument of node.arguments.slice(1)) {
      if (ts.isCallExpression(argument) && ts.isIdentifier(argument.expression)
        && factories.has(argument.expression.text)) owner = factories.get(argument.expression.text);
    }
    const permissions = [];
    visit(node, child => {
      if (!ts.isCallExpression(child)) return;
      const name = child.expression.getText(app);
      if (name === 'requireAdminPermission') permissions.push(literal(child.arguments[0]));
      if (name === 'lazyRouter' || /container\.resolve$/.test(name)) {
        const resolved = bindings.get(literal(child.arguments[0]));
        if (resolved) owner = resolved;
        else if (name === 'lazyRouter') throw new Error(`ADMIN_ROUTER_BINDING_UNRESOLVED:${prefix}`);
        // Inline Router.create dependencies may resolve repositories, not routers.
      }
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
    // Record a policy only when router middleware passes its resolved permission
    // to the evaluator. An import or an unused resolver is not authorization evidence.
    const resolvers = new Map();
    visit(ast, node => {
      if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer
        || !(ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) return;
      const permissions = [...node.initializer.getText(ast).matchAll(/['"](admin:[a-z0-9:*_-]+)['"]/g)].map(match => match[1]);
      if (permissions.length) resolvers.set(node.name.text, {
        source: node.initializer.getText(ast), permissions: [...new Set(permissions)].sort(),
        initializer: node.initializer, position: node.pos, block: node.parent.parent.parent,
      });
    });
    const conditionalGuards = [];
    visit(ast, node => {
      if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)
        || node.expression.name.text !== 'use' || !routerNames.has(node.expression.expression.getText(ast))
        || node.arguments.length !== 1) return;
      const bindings = new Map();
      visit(node.arguments[0], child => {
        if (ts.isVariableDeclaration(child) && ts.isIdentifier(child.name) && child.initializer
          && ts.isCallExpression(child.initializer) && ts.isIdentifier(child.initializer.expression)
          && resolvers.has(child.initializer.expression.text)
          && child.initializer.arguments.map(argument => argument.getText(ast)).join(',') === 'req.method,req.path')
          bindings.set(child.name.text, child.initializer.expression.text);
      });
      visit(node.arguments[0], child => {
        if (!ts.isCallExpression(child) || !ts.isPropertyAccessExpression(child.expression)
          || child.expression.name.text !== 'evaluatePermission' || !child.arguments[1]
          || !ts.isIdentifier(child.arguments[1]) || !bindings.has(child.arguments[1].text)) return;
        const resolver = bindings.get(child.arguments[1].text);
        const policy = resolvers.get(resolver);
        conditionalGuards.push({ position: node.pos, router: node.expression.expression.getText(ast),
          resolver, permissions: policy.permissions,
          sourceFingerprint: createHash('sha256').update(`${policy.source}\n${node.getText(ast)}`).digest('hex') });
      });
    });
    visit(ast, node => {
      if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)
        || !['post', 'put', 'patch', 'delete'].includes(node.expression.name.text)) return;
      if (ts.isCallExpression(node.expression.expression) && /\.route$/.test(node.expression.expression.expression.getText(ast)))
        throw new Error('CHAINED_ADMIN_ROUTE_REQUIRES_REVIEW');
      if (!routerNames.has(node.expression.expression.getText(ast))) return;
      const routePaths = staticRoutePaths(node.arguments[0], node, ast);
      if (!routePaths) throw new Error(`ADMIN_DYNAMIC_ROUTE_REQUIRES_REVIEW:${mount.owner}`);
      for (const route of routePaths) {
        const method = node.expression.name.text.toUpperCase();
        const fullPath = mount.prefix + (route === '/' ? '' : route);
        const text = node.getText(ast);
        const inlinePermissions = [...text.matchAll(/['"](admin:[a-z0-9:*_-]+)['"]/g)].map(match => match[1]);
        const inheritedPolicies = conditionalGuards.filter(guard => guard.position < node.pos && guard.router === node.expression.expression.getText(ast))
          .map(({ position: _position, router: _router, ...policy }) => policy);
        // Record named route middleware too: moving a permission into a local
        // helper must not erase it or hide later changes to that helper.
        for (const argument of node.arguments.slice(1)) {
          const name = ts.isIdentifier(argument) ? argument.text
            : ts.isCallExpression(argument) && ts.isIdentifier(argument.expression) ? argument.expression.text : null;
          const policy = resolvers.get(name);
          if (!policy || policy.position >= node.pos || policy.block !== node.parent.parent) continue;
          let permissions = policy.permissions;
          if (ts.isCallExpression(argument)) {
            const fn = policy.initializer;
            const body = fn.body;
            // Finite literal action passed to a direct permission-prefix guard.
            if (fn.parameters.length !== 1 || !ts.isIdentifier(fn.parameters[0].name)
              || !ts.isCallExpression(body) || body.expression.getText(ast) !== 'SecurityMiddlewareFactory.createAdminPermissionGuard') continue;
            const expression = body.arguments[0];
            const action = literal(argument.arguments[0]);
            if (!expression || !ts.isBinaryExpression(expression) || expression.operatorToken.kind !== ts.SyntaxKind.PlusToken
              || !ts.isIdentifier(expression.right) || expression.right.text !== fn.parameters[0].name.text
              || !/^admin:[a-z0-9:-]+:$/.test(literal(expression.left) ?? '') || !/^[a-z][a-z0-9-]*$/.test(action ?? '')) continue;
            permissions = [literal(expression.left) + action];
          }
          inheritedPolicies.push({ resolver: name, permissions,
            sourceFingerprint: createHash('sha256').update(`${policy.source}\n${argument.getText(ast)}`).digest('hex') });
        }
        const permissionEvidence = [...new Set([...mount.permissions, ...inlinePermissions, ...inheritedPolicies.flatMap(policy => policy.permissions)])];
        // A conditional per-route guard is recorded explicitly, rather than claiming
        // that a class-wide evaluator import proves the authorization of every route.
        const conditional = routePaths.length > 1 || inheritedPolicies.length > 0 || /\b(permit|transitionPermission|requireSupportMutation)\b/.test(text);
        const validation = /\.(safeParse|parse)\s*\(|\bparseStrict\s*\(/.test(text)
          ? 'DIRECT_API_PARSE' : 'OWNER_OR_HANDLER_VERIFICATION_REQUIRED';
        const classification = classify({ method, originalUrl: `/api/v1${fullPath}` }, 'ADMIN');
        output.push({ method, path: fullPath, owner: mount.owner,
          classification,
          permissionEvidence, conditionalPermissionReview: conditional,
          validationEvidence: validation, idempotency: fullPath === '/admin/review-workspace/query' ? 'READ_ONLY_BODY_QUERY'
            : fullPath.startsWith('/admin/review-workspace/') ? 'OWNER_COORDINATION_IDEMPOTENCY_REQUIRED'
            : method === 'DELETE' ? 'DELETE_SEMANTICS_OWNER_VERIFICATION_REQUIRED'
            : fullPath === '/admin/student-tools/:toolKey/test' ? 'OWNER_ENCRYPTED_EXECUTION_REQUIRED' : 'GLOBAL_ADMIN_REQUIRED',
          ...(inheritedPolicies.length ? { conditionalPermissionPolicies: inheritedPolicies } : {}),
          auditEvidence: classification === 'NO_AUDIT_REQUIRED' ? 'REVIEWED_NON_MUTATING_POST_EXEMPTION' : 'REQUEST_INTENT_AND_BEST_EFFORT_HTTP_OUTCOME',
          atomicBusinessAudit: 'OWNER_VERIFICATION_REQUIRED', atomicOutbox: 'OWNER_VERIFICATION_REQUIRED',
          source: `apps/api/src/presentation/api/router/${mount.owner}.ts`,
        });
      }
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
