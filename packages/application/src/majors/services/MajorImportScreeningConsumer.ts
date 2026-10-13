import { MajorImportPayloadSchema, type IImportHandoffConsumer, type UniversalImportHandoff } from '@manaratak/domain';
import { z } from 'zod';
const sourceUrl=z.union([z.literal(''),z.string().url().refine(value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}})]);
const schema=MajorImportPayloadSchema.omit({sourceImportRecordId:true}).extend({canonicalMajorName:z.string().trim().min(1).max(300),degreeLevel:z.enum(['BACHELOR','MASTER','DOCTORATE']),degreeLevelId:z.string().uuid(),sourceUrl:sourceUrl.optional(),officialSourceUrl:sourceUrl.optional()}).strict();
export function parseMajorOwnerPayload(raw:unknown) {
  if(!raw||typeof raw!=='object'||Buffer.byteLength(JSON.stringify(raw))>64000)throw new Error('MAJOR_IMPORT_PAYLOAD_INVALID');
  const inspect=(value:unknown,depth=0)=>{if(depth>8)throw new Error('MAJOR_IMPORT_PAYLOAD_DEPTH');if(value&&typeof value==='object')for(const[key,item]of Object.entries(value)){if(['__proto__','prototype','constructor','currentPublishedVersionId','approvedBy','isPubliclyVisible','status'].includes(key))throw new Error('MAJOR_IMPORT_OWNER_FIELD_FORBIDDEN');inspect(item,depth+1);}};
  inspect(raw);return schema.parse(raw);
}
/** P6 is transport only. Durable approval and canonical writes belong to P10. */
export class MajorImportScreeningConsumer implements IImportHandoffConsumer {
  readonly effectMode='SCREENING_ONLY' as const;
  async accept(handoff:UniversalImportHandoff) {
    if(!['MAJORS','MAJOR'].includes(handoff.ownerDomain.trim().toUpperCase()))throw new Error('MAJOR_IMPORT_OWNER_MISMATCH');
    try {
      const payload=parseMajorOwnerPayload(handoff.normalizedPayload);
      const valid=handoff.validation.state!=='INVALID'&&!handoff.validation.issues.some(issue=>issue.severity==='ERROR');
      return {owner:'MAJORS',schemaVersion:1,state:valid?'NEEDS_OWNER_REVIEW':'INVALID',dryRun:handoff.execution.dryRun,payload,
        origin:{batchId:handoff.referenceMetadata?.importBatchId??null,sourceDedupKey:handoff.referenceMetadata?.sourceRecordDedupKey??null},source:{artifactId:handoff.artifact.artifactId??null,sha256:handoff.referenceMetadata?.artifactSha256??handoff.provenance.contentHash??null}};
    }catch{return {owner:'MAJORS',schemaVersion:1,state:'INVALID',dryRun:handoff.execution.dryRun,payload:null};}
  }
}
