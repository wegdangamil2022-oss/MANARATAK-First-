import test from 'node:test';
import assert from 'node:assert/strict';
import {verificationRestoreList} from '../../scripts/database/post28-backup-contract.mjs';
const toc='; Archive created at 2026-10-16\n5; 2615 2200 SCHEMA - public owner\n2; 3079 18000 EXTENSION - pg_trgm\n3; 0 0 COMMENT - EXTENSION pg_trgm\n6; 1259 18001 TABLE public Example owner\n7; 0 18001 TABLE DATA public Example owner\n';
test('only preprovisioned public schema and pg_trgm are excluded',()=>{
 const r=verificationRestoreList(toc);assert.equal(r.excluded.length,3);assert.equal(r.objects,5);
 assert.match(r.text,/^6;.*TABLE public Example/m);assert.match(r.text,/^7;.*TABLE DATA public Example/m);
 assert.notEqual(r.originalSha256,r.filteredSha256);
});
for(const [name,input,code] of [['invalid','',/TOC_INVALID/],['unknown schema',toc.replace('SCHEMA - public','SCHEMA - secret'),/UNEXPECTED_SCHEMA/],['unknown extension',toc.replaceAll('pg_trgm','dblink'),/UNEXPECTED_EXTENSION/],['missing schema',toc.replace('5; 2615 2200 SCHEMA - public owner\n',''),/INCOMPLETE/],['missing extension',toc.replace(/^.*(?:EXTENSION).*\n/gm,''),/INCOMPLETE/]])test(name,()=>assert.throws(()=>verificationRestoreList(input),code));
