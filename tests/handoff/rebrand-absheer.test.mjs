import test from 'node:test';
import assert from 'node:assert/strict';
import { transformText, transformPath, containsLegacy } from '../../scripts/rebrand-absheer.mjs';

const old = ['manara','tak'].join('');
test('renames all brand cases without changing unrelated content',()=>{
  assert.equal(transformText(old),'absheer');
  assert.equal(transformText(old.toUpperCase()),'ABSHEER');
  assert.equal(transformText(old[0].toUpperCase()+old.slice(1)),'Absheer');
  assert.equal(transformText('@'+old+'/ui'),'@absheer/ui');
  assert.equal(transformText('@'+old+'-vendor/awilix-core'),'@absheer-vendor/awilix-core');
  assert.equal(transformText(old+'-production-api'),'absheer-production-api');
});
test('rebrands old Arabic copy and CSS variable names',()=>{
  assert.equal(transformText(['منار','تك'].join('')),'أبشر');
  assert.equal(transformText('--'+'mn-primary'),'--ab-primary');
  assert.equal(transformText('className="mn-card"'),'className="ab-card"');
  assert.equal(transformText('MNT-AUD-001'),'ABSH-AUD-001');
});
test('renames filename and remains idempotent',()=>{
  assert.equal(transformPath('apps/web/src/'+['Manara','tak'].join('')+'Logo.tsx'),'apps/web/src/AbsheerLogo.tsx');
  assert.equal(transformText(transformText('@'+old+'/domain')),'@absheer/domain');
});
test('detects legacy values and accepts new owner identity',()=>{
  assert.equal(containsLegacy('@'+old+'/core'),true);
  assert.equal(containsLegacy('ABSHEER Enterprise'),false);
  assert.equal(containsLegacy('أبشر للتعليم العالمي'),false);
});
