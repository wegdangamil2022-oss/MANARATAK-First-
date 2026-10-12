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
