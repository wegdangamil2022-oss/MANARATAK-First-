import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {preflightTargets} from '../../scripts/database/post28-isolation.mjs';
import {readDatabaseIdentity} from '../../scripts/database/post28-preflight.mjs';
import {requirePost28LocalExecution} from '../../scripts/database/post28-neon-policy.mjs';
import {requireScopedR06Authorization} from '../../scripts/database/post28-r06-authorization.mjs';
export async function assertPost28RuntimeTarget(env=process.env){
 if(env.POST28_ISOLATED_EXECUTION!=='YES'||env.POST28_TARGET_LABEL!=='DB-T'||env.POST28_DATABASE_SUITE!=='assets'||env.DATABASE_URL!==env.DIRECT_URL)throw new Error('POST28_ASSET_RUNTIME_TARGET_REQUIRED');
 requireScopedR06Authorization();
 if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw new Error('POST28_CLEAN_SOURCE_REQUIRED');
 const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const contract=JSON.parse(fs.readFileSync(env.POST28_TARGET_CONTRACT_FILE,'utf8'));requirePost28LocalExecution(contract);
 await preflightTargets(contract,[{label:'DB-T',url:env.DATABASE_URL}],env,sha,readDatabaseIdentity,{requireValidatedCatalog:true});
}
