import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

test('the real app checks scholarship permission before the generic Admin replay boundary',()=>{
 const source=fs.readFileSync('apps/api/src/app.ts','utf8');
 const tree=ts.createSourceFile('app.ts',source,ts.ScriptTarget.Latest,true);
 const calls=[];
 function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(tree)==='v1Router.use')calls.push(node);ts.forEachChild(node,visit);}
 visit(tree);
 const mounted=calls.find(n=>ts.isStringLiteral(n.arguments[0])&&n.arguments[0].text==='/admin'&&n.arguments[1]?.getText(tree).includes('createCanonicalIdempotencyMiddleware'));
 assert.ok(mounted);
 const callback=mounted.arguments[1].getText(tree);
 assert.ok(callback.includes('/^\\/scholarships(?:\\/|$)/i.test(req.path)'));
 assert.ok(callback.includes("return requireAdminPermission('admin:scholarships:manage')(req, res, () => command(req, res, next));"));
 assert.ok(callback.indexOf("return requireAdminPermission('admin:scholarships:manage')")<callback.lastIndexOf('return command(req, res, next);'));
 const router=calls.find(n=>ts.isStringLiteral(n.arguments[0])&&n.arguments[0].text==='/admin/scholarships');
 assert.equal(router.arguments[1].getText(tree),"requireAdminPermission('admin:scholarships:manage')");
});
