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
 const mounts=calls.filter(n=>ts.isStringLiteral(n.arguments[0])&&n.arguments[0].text==='/admin/scholarships');
 const early=mounts.find(n=>n.arguments.length===2&&n.arguments[1].getText(tree)==="requireAdminPermission('admin:scholarships:manage')");
 const replay=calls.find(n=>ts.isStringLiteral(n.arguments[0])&&n.arguments[0].text==='/admin'&&n.arguments[1]?.getText(tree).includes('createCanonicalIdempotencyMiddleware'));
 assert.ok(early&&replay);assert.ok(early.pos<replay.pos);
 assert.ok(mounts.some(n=>n.arguments.length===3&&n.arguments[1].getText(tree)==="requireAdminPermission('admin:scholarships:manage')"));
});
