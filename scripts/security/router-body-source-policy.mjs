import ts from 'typescript';

// Only mask bounded rate-limit keys and discarded envelope fields whose sole
// remaining binding flows directly into a schema parser. All other reads remain visible.
export function maskValidatedEnvelopeReads(source) {
  const file = ts.createSourceFile('router.ts', source, ts.ScriptTarget.Latest, true);
  const spans = [];
  const boundedKeys = new Set([
    "emailKey=(field:string)=>(req:Request)=>typeofreq.body?.[field]==='string'?req.body[field].trim().toLowerCase().slice(0,255):undefined",
    "tokenKey=(req:Request)=>typeofreq.body?.token==='string'?req.body.token.trim().slice(0,512):undefined",
  ]);
  const walk = (node, visitor) => { visitor(node); ts.forEachChild(node, child => walk(child, visitor)); };
  walk(file, node => {
    if (!ts.isVariableDeclaration(node)) return;
    if (boundedKeys.has(node.getText(file).replace(/\s+/g, ''))) {
      spans.push([node.getStart(file), node.end]); return;
    }
    if (!ts.isObjectBindingPattern(node.name) || node.initializer?.getText(file) !== 'req.body') return;
    const elements = node.name.elements;
    const rest = elements.find(element => element.dotDotDotToken);
    if (!rest || !ts.isIdentifier(rest.name) || elements.some(element => !ts.isIdentifier(element.name))) return;
    let scope = node.parent;
    while (scope && !ts.isArrowFunction(scope) && !ts.isFunctionExpression(scope)) scope = scope.parent;
    if (!scope) return;
    for (const element of elements) {
      const uses = [];
      walk(scope.body, child => {
        if (ts.isIdentifier(child) && child.text === element.name.text && child !== element.name)
          uses.push(child);
      });
      if (element !== rest) {
        if (!element.name.text.startsWith('_') || uses.length) return;
      } else {
        if (uses.length !== 1) return;
        const call = uses[0].parent;
        if (!ts.isCallExpression(call) || !call.arguments.includes(uses[0]) ||
            !ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== 'parse') return;
      }
    }
    spans.push([node.getStart(file), node.end]);
  });
  for (const [start, end] of spans.sort((a, b) => b[0] - a[0]))
    source = source.slice(0, start) + source.slice(start, end).replaceAll('req.body', 'safeBody') + source.slice(end);
  return source;
}
