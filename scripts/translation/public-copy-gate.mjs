import ts from 'typescript';
/** Detect rendered Arabic literals that cannot be justified by dictionary parity. */
export function untranslatedPublicCopy(source, filename='component.tsx') {
  const ast=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const findings=[];
  const add=(node)=>findings.push({file:filename,line:ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1});
  function visit(node){
    if(ts.isJsxText(node)&&/[\u0600-\u06ff]/u.test(node.getText(ast)))add(node);
    if(ts.isJsxAttribute(node)&&node.initializer&&ts.isStringLiteral(node.initializer)&&['title','placeholder','aria-label','alt'].includes(node.name.getText(ast))&&/[\u0600-\u06ff]/u.test(node.initializer.text))add(node);
    ts.forEachChild(node,visit);
  }
  visit(ast);return findings;
}
