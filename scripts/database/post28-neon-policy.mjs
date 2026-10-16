// Declaration checks only. This module opens no connection and grants no execution authority.
const fail=code=>{throw new Error(code);};
const identifier=/^[a-z0-9][a-z0-9-]{2,100}$/;
const labels=new Set(['DB-G','DB-S','DB-U','DB-T','DB-E','DB-L']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function requirePost28LocalExecution(contract) {
  if(contract?.kind!=='POST28_LOCAL_DATABASE_TARGETS')fail('POST28_NEON_RUNTIME_NOT_AUTHORIZED');
}
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
    directHost:expected.directHost,database,role,roleKind:expected.roleKind,postgresMajor:contract.postgresMajor,
    declarationChecked:true,liveIdentityVerified:false,runtimeExecutionAuthorized:false};
}

// A declaration is not provider evidence. This stronger entry point binds the
// existing offline policy to the repository registry and one fresh read-only run.
export function validateNeonPreflightDeclaration(contract,label,rawUrl,env,sourceSha,registry) {
  if(!['test','development'].includes(env.NODE_ENV)||env.POST28_ISOLATED_EXECUTION!=='YES'||
      env.DATABASE_TARGET_CLASS!=='DISPOSABLE')fail('POST28_NEON_ISOLATION_REQUIRED');
  if(env.NODE_TLS_REJECT_UNAUTHORIZED==='0'||env.PGSSLMODE==='disable'||env.PGSSLMODE==='allow'||
      env.PGSSLMODE==='prefer')fail('POST28_NEON_UNSAFE_TLS_ENVIRONMENT');
  if(!uuid.test(contract?.runId??'')||contract.purpose!=='READ_ONLY_PREFLIGHT'||
      registry?.schemaVersion!==1||registry.repository!=='wegdangamil2022-oss/MANARATAK-First-'||
      registry.neon?.projectId!=='lively-feather-03681988'||
      registry.neon?.validationBranchId!=='br-patient-recipe-bahs1ix7'||
      registry.neon?.validationDatabase!=='manaratak_test'||
      contract.projectId!==registry.neon.projectId||contract.postgresMajor!==registry.neon.pgMajorVersion||
      contract.referenceBranchId!==registry.neon.validationBranchId)
    fail('POST28_NEON_REGISTRY_BINDING_REQUIRED');
  const result=validateNeonDeclaration(contract,label,rawUrl,sourceSha);
  const target=contract.targets[label];
  // The long-lived reference is never a destructive target, even if empty.
  if(result.branchId===registry.neon.validationBranchId||
      !/^post28-[a-z0-9-]+$/.test(target.branchName??''))fail('POST28_NEON_REFERENCE_TARGET_FORBIDDEN');
  return {...result,provider:'NEON',sourceSha,runId:contract.runId,referenceBranchId:contract.referenceBranchId,
    regionId:registry.neon.regionId,branchName:target.branchName};
}

export function inspectNeonProviderIdentity(expected,provider) {
  const {project,branch,endpoint,database,role}=provider??{};
  if(project?.id!==expected.projectId||project.pg_version!==expected.postgresMajor||
      project.region_id!==expected.regionId||branch?.id!==expected.branchId||
      branch.project_id!==expected.projectId||branch.name!==expected.branchName||
      branch.parent_id!==expected.referenceBranchId||branch.default!==false||branch.primary!==false||
      branch.current_state!=='ready'||endpoint?.id!==expected.endpointId||
      endpoint.project_id!==expected.projectId||endpoint.branch_id!==expected.branchId||
      endpoint.host!==expected.directHost||endpoint.type!=='read_write'||endpoint.disabled!==false||
      database?.name!==expected.database||database.branch_id!==expected.branchId||
      role?.name!==expected.role||role.branch_id!==expected.branchId||
      typeof database.owner_name!=='string'||!database.owner_name||database.owner_name===expected.role)
    fail('POST28_NEON_PROVIDER_IDENTITY_MISMATCH');
  return true;
}

export function requireNeonTcpPolicy(target,policy) {
  if(policy?.version!==1||!Array.isArray(policy.tcp_network_access?.domains)||
      !target?.directHost||!policy.tcp_network_access.domains.includes(target.directHost))
    fail('POST28_NEON_TCP_ACCESS_NOT_CONFIGURED');
}

export function inspectNeonLiveIdentity(expected,live,{requireEmpty=false,requireValidatedCatalog=false}={}) {
  if(!live||live.database!==expected.database||live.role!==expected.role||live.sessionRole!==expected.role||
      live.postgresMajor!==expected.postgresMajor||!['UTC','GMT','Etc/UTC'].includes(live.timezone)||
      !/^[1-9][0-9]*$/.test(live.databaseOid??'')||live.sessionReplicationRole!=='origin')
    fail('POST28_NEON_LIVE_IDENTITY_MISMATCH');
  if(live.probeReadOnly!==true)fail('POST28_READ_ONLY_PROBE_REQUIRED');
  if(live.tls!==true||!['TLSv1.2','TLSv1.3'].includes(live.tlsVersion))fail('POST28_NEON_LIVE_TLS_REQUIRED');
  for(const key of ['superuser','createRole','createDatabase','replication','bypassRls','privilegedMembership',
    'globalWrite','globalRead','databaseOwner','databaseCreate','otherSchemaCreate'])
    if(live[key]!==false)fail('POST28_ELEVATED_DATABASE_ROLE');
  if(live.canConnect!==true||live.schemaUsage!==true||typeof live.schemaCreate!=='boolean'||typeof live.ownsRelations!=='boolean')
    fail('POST28_NEON_ROLE_GRANTS_REQUIRED');
  if(['MIGRATION','SHADOW'].includes(expected.roleKind)&&!live.schemaCreate)
    fail('POST28_NEON_ROLE_GRANTS_REQUIRED');
  if(['APPLICATION','INSPECTOR'].includes(expected.roleKind)&&(live.schemaCreate||live.ownsRelations))
    fail('POST28_APPLICATION_DDL_FORBIDDEN');
  if(!Number.isSafeInteger(live.publicTables)||live.publicTables<0||(requireEmpty&&live.publicTables!==0))
    fail('POST28_EMPTY_DATABASE_REQUIRED');
  if(requireValidatedCatalog&&(live.unvalidatedConstraints!==0||live.invalidIndexes!==0))
    fail('POST28_CATALOG_VALIDATION_REQUIRED');
  return {label:expected.label,provider:'NEON',sourceSha:expected.sourceSha,runId:expected.runId,
    projectId:expected.projectId,branchId:expected.branchId,endpointId:expected.endpointId,
    database:live.database,databaseOid:live.databaseOid,role:live.role,roleKind:expected.roleKind,
    postgresMajor:live.postgresMajor,timezone:live.timezone,publicTables:live.publicTables,
    probeReadOnly:true,tls:true,tlsVersion:live.tlsVersion,liveIdentityVerified:true,
    runtimeExecutionAuthorized:false};
}
export function requireDistinctNeonDeclarations(a,b) {
  if(a.directHost===b.directHost&&a.database===b.database||
      a.projectId===b.projectId&&a.branchId===b.branchId&&a.database===b.database)
    fail('POST28_NEON_TARGET_ALIAS_COLLISION');
}
