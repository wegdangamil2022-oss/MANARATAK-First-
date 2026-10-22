const fail=()=>{throw new Error('MANAGED_SEED_SCOPE_OR_IDENTITY_INVALID');};
const hash=/^[a-f0-9]{64}$/;
const references=['reference-currencies','reference-languages','reference-countries'];
export function validateManagedReferenceSeed(approval,source,rawUrl,env) {
  const now=source.now??Date.now(),expiry=Date.parse(approval?.expiresAt);
  if(env.NODE_ENV!=='development'||env.NODE_TLS_REJECT_UNAUTHORIZED==='0'||
    approval?.kind!=='MANAGED_DEVELOPMENT_REFERENCE_SEED'||approval.environment!=='development'||approval.independent!==true||
    approval.authorization!=='DELEGATED_PROJECT_OWNER_REFERENCE_BOOTSTRAP'||
    !/^[a-z0-9-]{3,80}$/.test(approval.actorId??'')||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(approval.runId??'')||
    !/^[a-f0-9]{40}$/.test(source.sourceSha)||approval.sourceSha!==source.sourceSha||
    !hash.test(source.schemaSha256)||approval.schemaSha256!==source.schemaSha256||
    !hash.test(source.manifestSha256)||approval.manifestSha256!==source.manifestSha256||
    !Number.isFinite(expiry)||expiry<=now||expiry>now+3*3600000||
    source.inputs.length!==3||source.inputs.some((x,i)=>x.id!==references[i]||!hash.test(x.sourceHash)||approval.sourceHashes?.[x.id]!==x.sourceHash)||
    Object.keys(approval.sourceHashes??{}).length!==3)fail();
  const target=approval.target;
  if(!target||!/^[a-z0-9-]{5,100}$/.test(target.projectId??'')||target.projectId==='lively-feather-03681988'||
    !/^br-[a-z0-9-]+$/.test(target.branchId??'')||!/^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/.test(target.host??'')||
    target.host.includes('-pooler.')||!/^[a-z0-9_]{1,63}$/.test(target.database??'')||
    !/^manaratak_[a-z0-9_]+$/.test(target.role??'')||/owner|admin|postgres|migration|migrator/.test(target.role)||
    !/^[1-9][0-9]*$/.test(target.databaseOid??''))fail();
  let url;try{url=new URL(rawUrl);}catch{fail();}
  const entries=[...url.searchParams];
  if(!['postgresql:','postgres:'].includes(url.protocol)||url.hostname!==target.host||url.hash||!url.password||
    url.port&&url.port!=='5432'||decodeURIComponent(url.pathname.slice(1))!==target.database||decodeURIComponent(url.username)!==target.role||
    new Set(entries.map(([key])=>key)).size!==entries.length||
    entries.some(([key])=>!['sslmode','sslaccept','sslcert','connect_timeout','connection_limit','schema'].includes(key))||
    url.searchParams.get('sslmode')!=='require'||url.searchParams.get('sslaccept')!=='strict'||
    url.searchParams.has('schema')&&url.searchParams.get('schema')!=='public')fail();
  return {target,actorId:approval.actorId,runId:approval.runId};
}
export function validateManagedSeedIdentity(target,live,ledgerAccess) {
  if(live?.database!==target.database||live.role!==target.role||live.sessionRole!==target.role||live.databaseOid!==target.databaseOid||
    live.postgresMajor!==16||live.tls!==true||live.probeReadOnly!==true||live.canConnect!==true||live.schemaUsage!==true||
    live.unvalidatedConstraints!==0||live.invalidIndexes!==0||ledgerAccess!==false)fail();
  for(const key of ['superuser','createRole','createDatabase','replication','bypassRls','privilegedMembership','globalRead','globalWrite',
    'databaseOwner','databaseCreate','schemaCreate','otherSchemaCreate','ownsRelations'])if(live[key]!==false)fail();
}
