import ts from 'typescript';

// Inspect each guard independently, so a secure neighbouring route cannot hide
// a missing dependency. Property order and formatting are not security contracts.
export function inspectAdminGuards(source) {
  const file = ts.createSourceFile('app.ts', source, ts.ScriptTarget.Latest, true);
  const expected = {
    adminAccessAllowed:
      "(id:string)=>container.resolve<any>('staffLifecycleRepository').adminAccessAllowed(id)",
    mfaUseCases: "container.resolve('mfaUseCases')",
    mode: 'adminAuthMode',
    tokenProvider: 'adminTokenProvider',
    sessionManager: 'adminSessionManager',
    principalAccessValidator: 'principalAccessValidator',
  };
  const guards = [];
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(file) === 'SecurityMiddlewareFactory.createAdminGuard'
    ) {
      const options = node.arguments[0];
      const properties = new Map();
      let invalidShape =
        node.arguments.length !== 1 || !options || !ts.isObjectLiteralExpression(options);
      if (!invalidShape)
        for (const property of options.properties) {
          if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
            invalidShape = true;
            continue;
          }
          const name = property.name.getText(file);
          if (properties.has(name)) invalidShape = true;
          properties.set(
            name,
            (ts.isShorthandPropertyAssignment(property)
              ? name
              : property.initializer.getText(file)
            ).replace(/\s+/g, ''),
          );
        }
      let parent = node.parent;
      while (parent && !ts.isVariableDeclaration(parent)) parent = parent.parent;
      const invalid = Object.entries(expected)
        .filter(([key, value]) => properties.get(key) !== value)
        .map(([key]) => key);
      guards.push({
        valid: !invalidShape && invalid.length === 0,
        invalid,
        controlPlane: parent?.name?.getText(file) === 'protectControlPlane',
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return guards;
}
