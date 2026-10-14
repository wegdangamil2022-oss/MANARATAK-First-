import ts from 'typescript';
/** Detect rendered Arabic literals that cannot be justified by dictionary parity. */
export function untranslatedPublicCopy(source, filename='component.tsx') {
  const ast=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const findings=[];
  const add=(node)=>findings.push({file:filename,line:ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1});
  // Inspect prose in expressions as well as JSX text. Conditions, event handlers,
  // IDs and callback arguments are computation, not evidence of rendered copy.
  function inspectExpression(node){
    if(ts.isStringLiteralLike(node)){
      if(/[\u0600-\u06ff]/u.test(node.text))add(node);
    }else if(ts.isTemplateExpression(node)){
      if(/[\u0600-\u06ff]/u.test(node.head.text)||node.templateSpans.some(span=>/[\u0600-\u06ff]/u.test(span.literal.text)))add(node);
    }else if(ts.isConditionalExpression(node)){
      inspectExpression(node.whenTrue);inspectExpression(node.whenFalse);
    }else if(ts.isParenthesizedExpression(node)){
      inspectExpression(node.expression);
    }else if(ts.isBinaryExpression(node)&&[ts.SyntaxKind.BarBarToken,ts.SyntaxKind.QuestionQuestionToken,ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.PlusToken].includes(node.operatorToken.kind)){
      inspectExpression(node.left);inspectExpression(node.right);
    }
  }
  function visit(node){
    if(ts.isJsxText(node)&&/[\u0600-\u06ff]/u.test(node.getText(ast)))add(node);
    if(ts.isJsxAttribute(node)&&node.initializer&&ts.isStringLiteral(node.initializer)&&['title','placeholder','aria-label','alt'].includes(node.name.getText(ast))&&/[\u0600-\u06ff]/u.test(node.initializer.text))add(node);
    if(ts.isJsxExpression(node)&&node.expression&&(!ts.isJsxAttribute(node.parent)||['title','placeholder','aria-label','alt','label','text'].includes(node.parent.name.getText(ast))))inspectExpression(node.expression);
    ts.forEachChild(node,visit);
  }
  visit(ast);return findings;
}
