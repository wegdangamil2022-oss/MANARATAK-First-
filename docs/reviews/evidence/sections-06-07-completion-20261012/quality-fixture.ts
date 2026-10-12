import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { pathToFileURL } from 'node:url';
async function run() {
 const { PrismaReferenceDataRepository } = await import(pathToFileURL(process.cwd() + '/packages/infrastructure/src/reference-data/PrismaReferenceDataRepository.ts').href);
 const db = new PGlite();
 await db.exec(`
 CREATE TABLE "ReferenceCountry" (id text PRIMARY KEY, name text, "iso2Code" text, "defaultCurrencyCode" text, "defaultLanguageCode" text);
 CREATE TABLE "ReferenceCurrency" (id text PRIMARY KEY, name text, "isoCode" text, "isActive" boolean, "lifecycleState" text);
 CREATE TABLE "ReferenceLanguage" (id text PRIMARY KEY, name text, "isoCode" text, "isActive" boolean, "lifecycleState" text);
 CREATE TABLE "AdministrativeRegion" (id text PRIMARY KEY, name text, "countryIso2Code" text, "countryReferenceId" text);
 CREATE TABLE "ReferenceCity" (id text PRIMARY KEY, name text, "countryIso2Code" text, "countryReferenceId" text, "administrativeRegionId" text, timezone text);
 CREATE TABLE "ReferenceAliasRecord" (id text PRIMARY KEY, "entityType" text, "referenceId" text, "normalizedAlias" text, "isActive" boolean);
 INSERT INTO "ReferenceCurrency" VALUES ('usd','Dollar','USD',true,'ACTIVE'), ('eur','Euro','EUR',false,'ACTIVE');
 INSERT INTO "ReferenceLanguage" VALUES ('en','English','en',true,'ACTIVE');
 INSERT INTO "ReferenceCountry" VALUES ('us','United States','US','USD','en'),('ca','Canada','CA','EUR',null),('de','Germany','DE','USD','en');
 INSERT INTO "AdministrativeRegion" VALUES ('rus','US Region','US','us'),('rca','CA Region','CA','ca');
 INSERT INTO "ReferenceCity" VALUES ('one','One','US','us','rus','UTC'),('two','Two','US','ca',null,null),('three','Three','CA','ca','rca','UTC');
 INSERT INTO "ReferenceAliasRecord" VALUES ('a1','CITY','one','springfield',true),('a2','CITY','two','springfield',true),('a3','CITY','three','springfield',true),('a4','CITY','one','springfield',true),('a5','CURRENCY','usd','money',true),('a6','CURRENCY','eur','money',true);
 `);
 const repo = new PrismaReferenceDataRepository({ $queryRaw: async (sql: any) => (await db.query(sql.text, sql.values)).rows } as any);
 const us = await repo.getQualityReport({ countryIso2Code:'US' });
 assert.equal(us.counts.AMBIGUOUS_ALIAS,2); assert.equal(us.counts.MISSING_REGION,1); assert.equal(us.counts.MISSING_TIMEZONE,1); assert.equal(us.counts.BROKEN_COUNTRY,1); assert.equal(us.total,5);
 const ca = await repo.getQualityReport({ countryIso2Code:'CA' });
 assert.equal(ca.counts.AMBIGUOUS_ALIAS,0); assert.equal(ca.counts.INVALID_CURRENCY,1); assert.equal(ca.counts.MISSING_LANGUAGE,1); assert.equal(ca.total,2);
 const de = await repo.getQualityReport({ countryIso2Code:'DE' }); assert.equal(de.total,0); assert.ok(Object.values(de.counts).every(n=>n===0));
 const all = await repo.getQualityReport({ kind:'AMBIGUOUS_ALIAS' }); assert.equal(all.total,4); assert.equal(all.data.filter(x=>x.entityType==='CURRENCY').length,2);
 // Duplicate aliases of one owner count once; foreign-country homonyms do not collide.
 for (let i=0;i<30;i++) await db.query('INSERT INTO "ReferenceCity" VALUES ($1,$2,$3,$4,NULL,$5)', [`extra-${i}`,`Extra ${i}`,'US','us','UTC']);
 const first = await repo.getQualityReport({ countryIso2Code:'US',kind:'MISSING_REGION' });
 const next = await repo.getQualityReport({ countryIso2Code:'US',kind:'MISSING_REGION',page:2 });
 assert.equal(first.total,31); assert.equal(first.data.length,25); assert.equal(next.data.length,6); assert.deepEqual(first.counts,next.counts);
 assert.ok(next.data.every(x=>!first.data.some(y=>y.referenceId===x.referenceId)));
 assert.equal((await repo.getQualityReport({ countryIso2Code:'US',kind:'MISSING_REGION',page:3 })).data.length,0);
 await db.close();
 console.log('QUALITY_POSTGRES_FIXTURES_PASS: country scope, default references, same-owner dedup, cross-country aliases, global aliases, zero metrics and stable paging');
}
run().catch(error=>{ console.error(error); process.exitCode=1; });
