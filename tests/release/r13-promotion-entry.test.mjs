import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import * as promotion from '../../scripts/release/promote-environment.mjs';

const url=new URL('../../scripts/release/promote-environment.mjs',import.meta.url);
test('R13 promotion entry recognizes its native path and excludes imports and other scripts',()=>{
  assert.equal(typeof promotion.isPromotionCliEntry,'function');
  assert.equal(promotion.isPromotionCliEntry(fileURLToPath(url)),true);
  assert.equal(promotion.isPromotionCliEntry(undefined),false);
  assert.equal(promotion.isPromotionCliEntry(fileURLToPath(import.meta.url)),false);
});

test('R13 promotion import remains inert without exercising the promotion command',()=>{
  const result=spawnSync(process.execPath,['--input-type=module','--eval',`await import(${JSON.stringify(url.href)});console.log('PROMOTION_IMPORT_ONLY');`],{
    env:{SystemRoot:process.env.SystemRoot,PATH:process.env.PATH},encoding:'utf8',timeout:5000,
  });
  assert.equal(result.status,0,result.stderr);
  assert.equal(result.stdout.trim(),'PROMOTION_IMPORT_ONLY');
});
