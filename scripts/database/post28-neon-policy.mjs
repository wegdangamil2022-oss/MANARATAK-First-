// Declaration checks only. This module opens no connection and grants no execution authority.
const fail=code=>{throw new Error(code);};
const identifier=/^[a-z0-9][a-z0-9-]{2,100}$/;
const labels=new Set(['DB-G','DB-S','DB-U','DB-T','DB-E','DB-L']);
export function validateNeonDeclaration(contract,label,rawUrl,sourceSha) {
  if(contract?.version!==1||contract.kind!=='POST28_NEON_TEST_DECLARATIONS'||contract.sourceSha!==sourceSha||
      !/^[a-f0-9]{40}$/.test(sourceSha??'')||!identifier.test(contract.projectId??'')||!labels.has(label)||
      !Number.isSafeInteger(contract.postgresMajor)||contract.postgresMajor<15)
    fail('POST28_NEON_CONTRACT_INVALID');
  const expected=contract.targets?.[label];
  if(!expected||!identifier.test(expected.branchId??'')||!/^ep-[a-z0-9-]+$/.test(expected.endpointId??'')||
      !['MIGRATION','SHADOW','APPLICATION','INSPECTOR'].includes(expected.roleKind))fail('POST28_NEON_TARGET_DECLARATION_MISSING');
  let url;try{url=new URL(rawUrl);}catch{fail('POST28_NEON_URL_INVALID');}
  const database=decodeURIComponent(url.pathname.slice(1)),role=decodeURIComponent(url.username);
  if(!['postgresql:','postgres:'].includes(url.protocol)||!url.password||url.hash||url.port&&url.port!=='5432'||
      !url.hostname.endsWith('.neon.tech')||url.hostname!==expected.directHost||
      !url.hostname.startsWith(expected.endpointId+'.')||url.hostname.includes('-pooler.')||
      !/^manaratak_post28_[a-z0-9_]+_test$/.test(database)||/prod|live|restore/i.test(database)||
      !/^post28_[a-z0-9_]+$/.test(role)||/owner|admin|bootstrap|postgres/i.test(role)||database!==expected.database||role!==expected.role)
    fail('POST28_NEON_UNSAFE_TARGET');
  const entries=[...url.searchParams];
  if(new Set(entries.map(([key])=>key)).size!==entries.length||
      entries.some(([key,value])=>!({schema:'public',sslmode:'require',sslaccept:'strict'})[key]||({schema:'public',sslmode:'require',sslaccept:'strict'})[key]!==value)||
      url.searchParams.get('sslmode')!=='require'||url.searchParams.get('sslaccept')!=='strict')
    fail('POST28_NEON_STRICT_PRISMA_TLS_REQUIRED');
  if(label==='DB-G'&&expected.roleKind!=='MIGRATION'||label==='DB-S'&&expected.roleKind!=='SHADOW'||
      ['DB-T','DB-E','DB-L'].includes(label)&&expected.roleKind!=='APPLICATION')fail('POST28_NEON_ROLE_KIND_MISMATCH');
  return {label,projectId:contract.projectId,branchId:expected.branchId,endpointId:expected.endpointId,
    directHost:expected.directHost,database,role,postgresMajor:contract.postgresMajor,
    declarationChecked:true,liveIdentityVerified:false,runtimeExecutionAuthorized:false};
}
export function requireDistinctNeonDeclarations(a,b) {
  if(a.directHost===b.directHost&&a.database===b.database||
      a.projectId===b.projectId&&a.branchId===b.branchId&&a.database===b.database)
    fail('POST28_NEON_TARGET_ALIAS_COLLISION');
}
