#!/usr/bin/env node
/**
 * ABSHEER white-label migration.
 * Applies a synchronized refactor to ALL tracked UTF-8 files and paths, not just UI.
 * Safe to rerun. Excludes original Git history and opaque binary font/assets.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const oldBrand = ['manara','tak'].join('');
export const newBrand = 'absheer';
const historicalVariant = ['manara','tal'].join('');
const oldArabic = ['منار','تك'].join('');
const oldArabicVariant = ['منارا','تك'].join('');
const oldCSS = ['m','n-'].join('');
const oldAudit = ['mn','t'].join('');
const legacyNames = new RegExp(oldBrand + '|' + historicalVariant, 'gi');
const legacyArabic = new RegExp(oldArabic + '|' + oldArabicVariant, 'g');
const cssToken = new RegExp(oldCSS, 'gi');
const auditPrefix = new RegExp('\\b' + oldAudit + '(?=[_-])', 'gi');

export function transformText(input) {
  return input
    .replace(legacyNames, hit => {
      if (hit === hit.toUpperCase()) return 'ABSHEER';
      if (hit[0] === hit[0].toUpperCase()) return 'Absheer';
      return 'absheer';
    })
    .replace(legacyArabic, 'أبشر')
    .replace(cssToken, hit => hit === hit.toUpperCase() ? 'AB-' : 'ab-')
    .replace(auditPrefix, hit => hit === hit.toUpperCase() ? 'ABSH' : 'absh');
}
export const transformPath = transformText;
export function containsLegacy(input) {
  legacyArabic.lastIndex = 0;
  cssToken.lastIndex = 0;
  auditPrefix.lastIndex = 0;
  return new RegExp(oldBrand + '|' + historicalVariant, 'i').test(input)
    || legacyArabic.test(input)
    || cssToken.test(input)
    || auditPrefix.test(input);
}
function gitFiles() {
  return execFileSync('git',['ls-files','-z'],{encoding:'utf8',maxBuffer:64*1024*1024}).split('\0').filter(Boolean);
}
function isText(file,bytes) {
  if(bytes.includes(0))return false;
  // Fonts, drawings and other binary assets stay byte-identical.
  if(/\.(?:woff2?|ttf|otf|png|jpe?g|ico|webp|gif|pdf|mp[34]|mov|zip|sqlite|db|p12|pfx)$/i.test(file))return false;
  return true;
}
export function migrate(root = process.cwd(),mode = 'apply'){
  const names=gitFiles();
  let renamed=0,edited=0,bytesEdited=0;
  const stale=[];
  const staged=[];
  const targets=new Set();
  for(const relative of names){
    const target=transformPath(relative);
    if(targets.has(target))throw Error('Path collision after rebranding: '+target);
    targets.add(target);
    const source=path.join(root,relative);
    if(!existsSync(source))continue;
    const buf=readFileSync(source);
    const textMode=isText(relative,buf);
    if(!textMode && target!==relative)throw Error('Cannot automatically rename brand-containing binary file: '+relative);
    let output=textMode?transformText(buf.toString('utf8')):null;
    if(mode==='check'){
      if(target!==relative)stale.push('PATH '+relative);
      if(textMode&&containsLegacy(buf.toString('utf8')))stale.push('CONTENT '+relative);
      continue;
    }
    if(textMode&&output!==buf.toString('utf8')){
      if(relative.endsWith('.json')||relative.endsWith('.jsonc')){
        if(relative.endsWith('.json'))JSON.parse(output);
      }
      bytesEdited+=buf.length;
      edited++;
      writeFileSync(source,output,'utf8');
    }
    if(target!==relative){staged.push({from:relative,to:target});renamed++;}
  }
  if(mode==='check'){
    if(stale.length){
      console.error(JSON.stringify({status:'FAIL',legacyReferences:stale.slice(0,140),total:stale.length},null,2));
      process.exitCode=1;
    }else console.log(JSON.stringify({status:'PASS',filesChecked:names.length,remainingOldBrandReferences:0}));
    return {files:names.length,stale};
  }
  // Rename deepest paths first, to avoid accidental overwrite when a directory moves.
  for(const {from,to} of staged.sort((a,b)=>b.from.length-a.from.length)){
    const p=path.join(root,to);
    if(existsSync(p))throw Error('Target already exists: '+to);
    mkdirSync(path.dirname(p),{recursive:true});
    renameSync(path.join(root,from),p);
  }
  console.log(JSON.stringify({status:'APPLIED',files:names.length,modifiedFiles:edited,renamedFiles:renamed,editedInputBytes:bytesEdited},null,2));
  return {files:names.length,edited,renamed};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
  migrate(process.cwd(),process.argv.includes('--check')?'check':'apply');
}
