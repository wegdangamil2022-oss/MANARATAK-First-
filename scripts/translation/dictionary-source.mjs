import ts from 'typescript';

// Parse actual object properties; quoting and formatting are not dictionary semantics.
export function readDictionaryEntries(source) {
  const ast = ts.createSourceFile('dictionary.ts', source, ts.ScriptTarget.Latest, true);
  const entries = [];
  for (const statement of ast.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !['ar', 'en'].includes(declaration.name.text)) continue;
      let object = declaration.initializer;
      while (object && (ts.isAsExpression(object) || ts.isSatisfiesExpression(object) || ts.isParenthesizedExpression(object))) object = object.expression;
      if (!object || !ts.isObjectLiteralExpression(object)) throw new Error('DICTIONARY_OBJECT_REQUIRED');
      for (const property of object.properties) {
        if (!ts.isPropertyAssignment(property) || !(ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name)) || !ts.isStringLiteralLike(property.initializer))
          throw new Error('DICTIONARY_STATIC_STRING_REQUIRED');
        const key = property.name.text;
        if (entries.some(entry => entry.key === key)) throw new Error(`DICTIONARY_DUPLICATE_KEY:${key}`);
        entries.push({ key, value: property.initializer.text });
      }
    }
  }
  return entries;
}

// Resolve the translator's lexical binding rather than treating every t(...) as
// a call into the shared UI dictionary. Other dictionaries keep their own typed keys.
export function literalUiTranslationKeys(source, filename = 'component.tsx') {
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const providers = new Set();
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !/\/i18n\/I18nProvider$/.test(statement.moduleSpecifier.text)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) for (const binding of bindings.elements)
      if ((binding.propertyName ?? binding.name).text === 'useTranslation') providers.add(binding.name.text);
  }
  const scopeOf = node => {
    for (let parent = node.parent; parent; parent = parent.parent)
      if (ts.isBlock(parent) || ts.isFunctionLike(parent) || ts.isSourceFile(parent) || ts.isForStatement(parent) || ts.isForOfStatement(parent)) return parent;
    return ast;
  };
  const scopes = new Map();
  const bind = (scope, name, canonical) => {
    if (!scopes.has(scope)) scopes.set(scope, new Map());
    scopes.get(scope).set(name, canonical);
  };
  const names = name => ts.isIdentifier(name) ? [name.text] : name.elements.flatMap(element => ts.isBindingElement(element) ? names(element.name) : []);
  const visit = (node, callback) => { callback(node); ts.forEachChild(node, child => visit(child, callback)); };
  visit(ast, node => {
    if (ts.isVariableDeclaration(node)) {
      const canonical = node.initializer && ts.isCallExpression(node.initializer) && ts.isIdentifier(node.initializer.expression) && providers.has(node.initializer.expression.text);
      for (const name of names(node.name)) bind(scopeOf(node), name, false);
      if (canonical && ts.isObjectBindingPattern(node.name)) for (const element of node.name.elements)
        if (ts.isIdentifier(element.name) && (element.propertyName ?? element.name).text === 't') bind(scopeOf(node), element.name.text, true);
    }
    if (ts.isParameter(node)) for (const name of names(node.name)) bind(scopeOf(node), name, false);
  });
  const keys = [];
  visit(ast, node => {
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.arguments.length < 1 || !ts.isStringLiteralLike(node.arguments[0])) return;
    for (let scope = scopeOf(node); scope; scope = scope === ast ? null : scopeOf(scope)) {
      const bindings = scopes.get(scope);
      if (bindings?.has(node.expression.text)) {
        if (bindings.get(node.expression.text)) keys.push(node.arguments[0].text);
        break;
      }
    }
  });
  return keys;
}
