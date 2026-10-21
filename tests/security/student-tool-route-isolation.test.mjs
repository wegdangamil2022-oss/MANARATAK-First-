import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../../apps/web/src/router/index.tsx', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('router.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const route = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'StudentToolPreviewRoute');
assert.ok(route, 'The routed tool wrapper must exist');
const code = route.getText(parsed);
const flag = 'import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE';
assert.equal(code.split(flag).length - 1, 1, 'Exercise the actual compile-time mode branch');
const compiled = ts.transpileModule(code.replace(flag, 'buildDataMode'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
}).outputText;

function resolveRoute(mode, toolKey, language = 'ar') {
  const liveTool = () => {};
  const redirect = () => {};
  const sandbox = {
    buildDataMode: mode,
    useParams: () => ({ toolKey }), useTranslation: () => ({ language }),
    StudentToolPage: liveTool, Navigate: redirect,
    React: { createElement: (type, props) => ({ type, props }) },
  };
  const result = vm.runInNewContext(compiled + '\nStudentToolPreviewRoute();', sandbox);
  return { result, liveTool, redirect };
}

test('API mode and the default mode retain the real executable student tool', () => {
  for (const mode of ['api', undefined]) {
    const { result, liveTool } = resolveRoute(mode, 'gpa-calculator');
    assert.equal(result.type, liveTool);
  }
});

test('only explicit prototype mode redirects to the localized design detail', () => {
  const { result, redirect } = resolveRoute('prototype', 'gpa-calculator', 'en');
  assert.equal(result.type, redirect);
  assert.equal(result.props.replace, true);
  assert.equal(result.props.to, '/en/tools?detail=tool-gpa-calculator');
});
