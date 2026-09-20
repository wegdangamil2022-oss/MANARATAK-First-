import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let files = 0;
let invalid = 0;
const isFile = (file) => fs.existsSync(file) && fs.statSync(file).isFile();

function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { scan(file); continue; }
    if (!entry.name.endsWith('.ts')) continue;
    files++;
    const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function report(node, specifier) {
      invalid++;
      const { line } = ast.getLineAndCharacterOfPosition(node.getStart(ast));
      console.error(`${path.relative(root, file)}:${line + 1}: invalid ESM specifier ${specifier}`);
    }
    function visit(node) {
      const dynamic = ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const literal = ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
        ? node.moduleSpecifier
        : dynamic ? node.arguments[0]
          : ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)
            ? node.argument.literal : undefined;
      if (dynamic && (!literal || !(ts.isStringLiteral(literal) || ts.isNoSubstitutionTemplateLiteral(literal)))) {
        report(node, '<non-literal dynamic import cannot be verified>');
      }
      if (literal && (ts.isStringLiteral(literal) || ts.isNoSubstitutionTemplateLiteral(literal))) {
        const specifier = literal.text;
        if (specifier.startsWith('./') || specifier.startsWith('../')) {
          const target = path.resolve(path.dirname(file), specifier);
          // Require the emitted extension AND a real corresponding source file.
          const sourceExtension = { '.js': '.ts', '.mjs': '.mts', '.cjs': '.cts' }[path.extname(target)];
          if (!sourceExtension || !(isFile(target) || isFile(target.slice(0, -path.extname(target).length) + sourceExtension))) {
            report(literal, specifier);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
}

scan(path.join(root, 'apps/api/src'));
console.log(`${files} TypeScript files scanned; ${invalid} invalid relative ESM specifiers`);
if (invalid) process.exitCode = 1;
