import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { readXlsxWorkbook, spreadsheetRowsToObjects } from '@manaratak/shared';
import { mapCountrySourceRecord, CountrySourceRecord } from '../../packages/application/src/reference-data/services/CountryImportPreviewService';
import { ReferenceDataImportHandoffService } from '../../packages/application/src/reference-data/services/ReferenceDataImportHandoffService';
export const hash = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export interface SeedInput { id: string; type: 'COUNTRY'|'CURRENCY'|'LANGUAGE'; sourceHash: string; sourceVersion: string; records: Record<string, any>[]; }
export async function referenceSeedPlan(root: string): Promise<SeedInput[]> {
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'scripts/database/greenfield-seed.manifest.json'),'utf8'));
  const result:SeedInput[]=[];
  for(const [id,type] of [['reference-currencies','CURRENCY'],['reference-languages','LANGUAGE'],['reference-countries','COUNTRY']] as const){
    const step=manifest.steps.find((s:any)=>s.id===id);
    if(step.state!=='READY')throw new Error('POST28_SEED_SOURCE_REVIEW_BLOCKED');
    const bytes=fs.readFileSync(path.join(root,step.sourcePath));
    if(hash(bytes)!==step.sourceSha256)throw new Error('POST28_SEED_SOURCE_HASH_MISMATCH');
    let records:Record<string,any>[];
    if(type==='COUNTRY'){
      const workbook=await readXlsxWorkbook(bytes);
      const rows=spreadsheetRowsToObjects<CountrySourceRecord>(workbook.sheets.get('Countries')!,{defaultValue:null,raw:false});
      if(rows.some(row=>String(row.reference_review_status).toUpperCase()!=='REVIEWED'))throw new Error('POST28_SEED_SOURCE_REVIEW_REQUIRED');
      records=rows.map(mapCountrySourceRecord);
    }else{
      const rows=parse(bytes.toString('utf8'),{columns:true,skip_empty_lines:true}) as Record<string,string>[];
      if(rows.some(row=>row.referenceReviewStatus!=='REVIEWED'))throw new Error('POST28_SEED_SOURCE_REVIEW_REQUIRED');
      records=rows.map(row=>type==='CURRENCY'?{
        isoCode:row.isoCode.trim().toUpperCase(),numericCode:row.numericCode||null,name:row.name.trim(),nameAr:row.nameAr||null,symbol:row.symbol||null,minorUnit:row.minorUnit!==''?Number(row.minorUnit):null,
        metadata:{currencyType:row.currencyType,lifecycleState:row.lifecycleState,referenceReviewStatus:row.referenceReviewStatus,provenance:row.provenance,notes:row.notes},
      }:{
        isoCode:row.isoCode.trim().toLowerCase(),name:row.name.trim(),nameAr:row.nameAr||null,nativeName:row.nativeName||null,direction:row.direction.trim().toUpperCase(),
        aliases:(row.aliases||'').split(',').map(alias=>({alias:alias.trim(),aliasType:'COMMON'})).filter(x=>x.alias),
        metadata:{languageType:row.languageType,lifecycleState:row.lifecycleState,referenceReviewStatus:row.referenceReviewStatus,provenance:row.provenance,notes:row.notes},
      });
      if(type==='LANGUAGE'&&rows.some(row=>row.isActive!=='true'))throw new Error('POST28_SEED_LIFECYCLE_REVIEW_REQUIRED');
    }
    const batch=new ReferenceDataImportHandoffService().prepareSeedBatch({seedBatchId:id,sourceName:step.sourcePath,sourceVersion:step.sourceVersion,entityType:type,records});
    if(batch.validationSummary?.invalidRecords||batch.records.some(r=>!r.validationReport?.canBeImported))throw new Error('POST28_SEED_PAYLOAD_INVALID');
    const expected=Object.values(step.expected)[0] as {exact?:number;minimum?:number};
    if(expected.exact!==undefined&&records.length!==expected.exact||expected.minimum!==undefined&&records.length<expected.minimum)throw new Error('POST28_SEED_SOURCE_COUNT_MISMATCH');
    result.push({id,type,sourceHash:step.sourceSha256,sourceVersion:step.sourceVersion,records});
  }
  const currencies=new Set(result[0].records.map(r=>r.isoCode)),languages=new Set(result[1].records.map(r=>r.isoCode));
  if(result[2].records.some(r=>r.defaultCurrencyCode&&!currencies.has(r.defaultCurrencyCode)||r.defaultLanguageCode&&!languages.has(r.defaultLanguageCode)))throw new Error('POST28_SEED_DEPENDENCY_MISSING');
  return result;
}

/** Match the persisted JSON artifact and actual P6 wire format; undefined means absent. */
export function referenceSeedPayload(input:SeedInput,record:Record<string,any>):Record<string,any>{
 const {aliases,...fields}=record;
 return JSON.parse(JSON.stringify({...fields,metadata:{...fields.metadata,post28SeedSource:{sha256:input.sourceHash,version:input.sourceVersion},...(aliases?.length?{reviewedSourceAliases:aliases}:{})}}));
}
