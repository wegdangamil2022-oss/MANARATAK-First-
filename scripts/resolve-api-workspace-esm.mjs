import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// TypeScript's bundler resolution preserves extensionless specifiers. Complete
// only emitted workspace paths so these artifacts also load in native Node ESM.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packages = ['core', 'shared', 'domain', 'config', 'application', 'infrastructure'];

function visitDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) visitDirectory(file);
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.d.ts')) completeSpecifiers(file);
  }
}

function completeSpecifiers(file) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const edits = [];
  function visit(node) {
    const literal = (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      ? node.moduleSpecifier
      : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
        ? node.arguments[0]
        : ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)
          ? node.argument.literal : undefined;
    if (literal && ts.isStringLiteral(literal) && literal.text.startsWith('.')) {
      const target = path.resolve(path.dirname(file), literal.text);
      const suffix = fs.existsSync(target) && fs.statSync(target).isFile() ? ''
        : fs.existsSync(target + '.js') ? '.js'
        : fs.existsSync(path.join(target, 'index.js')) ? '/index.js' : null;
      if (suffix === null) throw new Error('Unresolved emitted import in ' + path.relative(root, file));
      if (suffix) edits.push({ start: literal.getStart(ast) + 1, end: literal.end - 1, text: literal.text + suffix });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  if (output !== source) fs.writeFileSync(file, output);
}

for (const name of packages) visitDirectory(path.join(root, 'packages', name, 'dist'));
console.log('API workspace ESM artifacts resolved: ' + packages.join(', '));
