import {spawnSync} from 'node:child_process';

// Fixed origin, GET only, no redirect, credentials on stdin (never OS argv).
// curl preserves the managed environment's proxy and CA configuration.
export function createNeonProviderReader(env=process.env,request) {
  if(!env.NEON_API_KEY||/[\r\n]/.test(env.NEON_API_KEY))throw new Error('POST28_NEON_PROVIDER_CREDENTIAL_REQUIRED');
  const get=request??(async resource=>{
    const config=`url = ${JSON.stringify('https://api.neon.tech/v2/'+resource)}\n`+
      `header = ${JSON.stringify('Authorization: Bearer '+env.NEON_API_KEY)}\n`;
    const result=spawnSync('curl',['--disable','--config','-','--silent','--show-error','--fail',
      '--request','GET','--no-insecure','--tlsv1.2','--proto','=https','--max-redirs','0','--connect-timeout','10','--max-time','25'],
    {input:config,encoding:'utf8',env,maxBuffer:2*1024*1024});
    if(result.status!==0)throw new Error('POST28_NEON_PROVIDER_READ_FAILED');
    try{return JSON.parse(result.stdout);}catch{throw new Error('POST28_NEON_PROVIDER_RESPONSE_INVALID');}
  });
  return async expected=>{
    try {
      const base=`projects/${encodeURIComponent(expected.projectId)}`;
      const branch=`${base}/branches/${encodeURIComponent(expected.branchId)}`;
      const responses=await Promise.all([
        get(base),get(branch),get(`${base}/endpoints/${encodeURIComponent(expected.endpointId)}`),
        get(`${branch}/databases/${encodeURIComponent(expected.database)}`),
        get(`${branch}/roles/${encodeURIComponent(expected.role)}`),
      ]);
      // Explicit whitelist: API role records can contain passwords in some API
      // versions. Do not return, persist, log or interpolate full responses.
      const p=responses[0].project,b=responses[1].branch,e=responses[2].endpoint,
        d=responses[3].database,r=responses[4].role;
      return {project:p&&{id:p.id,pg_version:p.pg_version,region_id:p.region_id},
        branch:b&&{id:b.id,project_id:b.project_id,name:b.name,parent_id:b.parent_id,
          default:b.default,primary:b.primary,current_state:b.current_state},
        endpoint:e&&{id:e.id,project_id:e.project_id,branch_id:e.branch_id,host:e.host,
          type:e.type,disabled:e.disabled},
        database:d&&{name:d.name,branch_id:d.branch_id,owner_name:d.owner_name},
        role:r&&{name:r.name,branch_id:r.branch_id}};
    }catch{throw new Error('POST28_NEON_PROVIDER_READ_FAILED');}
  };
}
