import {digest,verifyMigrationLedger} from './post28-migration-inventory.mjs';
export const INVARIANT_TABLES={
 immutableReceipts:['FinanceCommandRecord','OwnerTranslationTransferReceipt'],
 financialLedger:['FinancialAccountRecord','FinancialTransactionRecord','FinancialLedgerEntryRecord','FinanceInvoiceRecord','FinancePaymentRecord','FinanceRefundRecord','FinanceWalletRecord','FinanceWalletHoldRecord'],
 studentConsent:['StudentWorkspace','StudentPrivacyConsentDecision','StudentApplicationDocumentBinding','ApiSearchRequestRecord'],
 assetBindings:['AssetRecord','StudentApplicationDocumentBinding'],
 universityPrograms:['University','UniversityAcademicProgram','DegreeLevel'],
 scholarshipTargets:['Scholarship','ScholarshipDegreeTarget','ScholarshipVersion'],
 courseProjections:['Course','CourseVersion','Major','CourseMajorProjection','StudentLearningProjection'],
 publishedVersions:['CmsContentNode','CmsLocalizedContent','CmsContentRevision','CmsPublishedContent','InternationalTest','InternationalTestVersion','InternationalTestPublicationSnapshot']
};
export const UPGRADE_AUDITS=[
 ['FinancePayment_positive_units',`SELECT count(*)::text AS violations FROM public."FinancePaymentRecord" WHERE NOT ("amountMinorUnits" ~ '^[1-9][0-9]{0,29}$')`],
 ['FinanceRefund_positive_units',`SELECT count(*)::text AS violations FROM public."FinanceRefundRecord" WHERE NOT ("amountMinorUnits" ~ '^[1-9][0-9]{0,29}$')`],
 ['FinanceTransfer_positive_units',`SELECT count(*)::text AS violations FROM public."FinanceTransferRecord" WHERE NOT ("sourceAmountMinorUnits" ~ '^[1-9][0-9]{0,29}$')`],
 ['FinanceWalletHold_positive_units',`SELECT count(*)::text AS violations FROM public."FinanceWalletHoldRecord" WHERE NOT ("amountMinorUnits" ~ '^[1-9][0-9]{0,29}$')`],
 ['FinanceLedger_positive_units',`SELECT count(*)::text AS violations FROM public."FinancialLedgerEntryRecord" WHERE NOT ("amountMinorUnits" ~ '^[1-9][0-9]{0,29}$' AND direction IN ('DEBIT','CREDIT'))`],
 ['ServiceCatalogRecord_fulfillment_policy',`SELECT count(*)::text AS violations FROM public."ServiceCatalogRecord" WHERE NOT ("fulfillmentPolicy" IN ('FREE','CHARGEABLE','QUOTE_REQUIRED'))`],
 ['ServicePricingRecord_bounded_money',`SELECT count(*)::text AS violations FROM public."ServicePricingRecord" WHERE NOT ("amountMinorUnits" ~ '^(0|[1-9][0-9]{0,29})$' AND scale BETWEEN 0 AND 6)`],
 ['SettingAssignmentRecord_id_currentVersionId_fkey',`SELECT count(*)::text AS violations FROM public."SettingAssignmentRecord" s WHERE s."currentVersionId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public."SettingVersionRecord" v WHERE v."assignmentId"=s.id AND v.id=s."currentVersionId")`],
 ['StudentApplicationDocumentBinding_assetId_fkey',`SELECT count(*)::text AS violations FROM public."StudentApplicationDocumentBinding" b WHERE NOT EXISTS (SELECT 1 FROM public."AssetRecord" a WHERE a.id=b."assetId")`]
];
export function requireZeroUpgradeAudits(audits){
 if(!Array.isArray(audits)||audits.length!==UPGRADE_AUDITS.length||new Set(audits.map(a=>a.constraint)).size!==UPGRADE_AUDITS.length||UPGRADE_AUDITS.some(([name])=>!audits.some(a=>a.constraint===name&&typeof a.violations==='string'&&/^(0|[1-9][0-9]*)$/.test(a.violations))))throw new Error('POST28_UPGRADE_AUDIT_PROOF_INCOMPLETE');
 if(audits.some(a=>a.violations!=='0'))throw new Error('POST28_UPGRADE_OWNER_REMEDIATION_REQUIRED');
 return {audits:audits.length,violations:0};
}
export function bindUpgradeComparisonPlan(candidate,contract){
 const t=contract.targets['DB-U'];
 return {...candidate.comparisonPlan,runId:contract.runId,expectedTarget:{label:'DB-U',host:t.host,port:t.port,database:t.database,role:t.role,roleKind:t.roleKind,serverIdentity:t.serverIdentity,databaseOid:t.databaseOid,markerSha256:digest(`POST28_DISPOSABLE:${contract.runId}:DB-U:${t.nonce}`)}};
}
export async function measureUpgradeState(client,candidate,contract){
 const plan=bindUpgradeComparisonPlan(candidate,contract);
 return client.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');await tx.$executeRawUnsafe("SET LOCAL statement_timeout='10s'");
  const [session]=await tx.$queryRawUnsafe(`SELECT current_setting('session_replication_role') AS replication,current_setting('transaction_read_only') AS readonly`);
  if(session.replication!=='origin'||session.readonly!=='on')throw new Error('POST28_UPGRADE_READ_ONLY_ORIGIN_REQUIRED');
  const ledger=await tx.$queryRawUnsafe(`SELECT id,migration_name,checksum,started_at::text,finished_at::text,rolled_back_at::text,applied_steps_count FROM public._prisma_migrations ORDER BY started_at,id`);
  verifyMigrationLedger({migrations:candidate.before.migrations},ledger);
  const counts={},tableHashes={};
  for(const model of plan.requiredModels){
   if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(model))throw new Error('POST28_UPGRADE_MODEL_NAME_INVALID');
   const [row]=await tx.$queryRawUnsafe(`SELECT count(*)::text AS count,encode(sha256(convert_to(COALESCE(string_agg(encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex'),'' ORDER BY encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex')),''),'UTF8')),'hex') AS hash FROM public."${model}" t`);
   counts[model]=row.count;tableHashes[model]=row.hash;
  }
  const invariants={};
  for(const [name,tables] of Object.entries(INVARIANT_TABLES)){
   if(tables.some(t=>!tableHashes[t]||counts[t]==='0'))throw new Error('POST28_UPGRADE_REPRESENTATIVE_GROUP_EMPTY');
   invariants[name]=digest(JSON.stringify(tables.map(t=>({model:t,rows:counts[t],sha256:tableHashes[t]}))));
  }
  const financialTotals=await tx.$queryRawUnsafe(`SELECT "accountId", "currencyCode" AS currency,scale, sum(CASE WHEN direction='DEBIT' THEN "amountMinorUnits"::numeric ELSE -"amountMinorUnits"::numeric END)::text AS "balanceUnits" FROM public."FinancialLedgerEntryRecord" GROUP BY "accountId","currencyCode",scale ORDER BY "accountId","currencyCode",scale`);
  const audits=[];for(const [constraint,sql] of UPGRADE_AUDITS){const [row]=await tx.$queryRawUnsafe(sql);audits.push({constraint,violations:row.violations});}
  const [legacy]=await tx.$queryRawUnsafe(`SELECT count(*)::integer AS count FROM public."ApiSearchRequestRecord" WHERE "actorReferenceId" IS NULL`);
  return {plan,measurement:{version:1,kind:'POST28_UPGRADE_MEASUREMENT',runId:contract.runId,sourceSha:candidate.before.sourceSha,target:plan.expectedTarget,sessionReplicationRole:session.replication,schemaSha256:candidate.before.schemaSha256,migrationChainSha256:digest(JSON.stringify(ledger.map(r=>({name:r.migration_name,checksum:r.checksum})))),counts,invariants,financialTotals},audits,tableHashes,ledger,legacyUnattributedSearchRows:legacy.count,readOnly:true};
 },{isolationLevel:'RepeatableRead',timeout:60000});
}
