export function localLabProfile(name='greenfield'){
 if(name==='greenfield')return {name,primary:'DB-G',secondary:'DB-S',roles:['migrator','shadow'],targets:[
  {label:'DB-G',kind:'greenfield',role:'migrator',roleKind:'MIGRATION'},
  {label:'DB-S',kind:'shadow',role:'shadow',roleKind:'SHADOW'}]};
 if(name==='upgrade')return {name,primary:'DB-U',secondary:'DB-V',roles:['upgrader','verifier'],targets:[
  {label:'DB-U',kind:'upgrade',role:'upgrader',roleKind:'MIGRATION'},
  {label:'DB-V',kind:'upgrade_verify',role:'verifier',roleKind:'MIGRATION'}]};
 if(name==='transactions')return {name,primary:'DB-T',secondary:null,roles:['tx_migrator'],targets:[{label:'DB-T',kind:'transactions',role:'app',roleKind:'APPLICATION'}]};
 throw new Error('POST28_LOCAL_LAB_PROFILE_INVALID');
}
export function preflightDeclarations(argv,env){
 if(argv.includes('--pair')&&argv.includes('--upgrade-pair'))throw new Error('POST28_PREFLIGHT_PAIR_CONFLICT');
 if(argv.includes('--upgrade-pair'))return [{label:'DB-U',url:env.UPGRADE_DATABASE_URL},{label:'DB-V',url:env.UPGRADE_VERIFY_DATABASE_URL}];
 if(argv.includes('--pair'))return [{label:'DB-G',url:env.GREENFIELD_DATABASE_URL},{label:'DB-S',url:env.GREENFIELD_SHADOW_DATABASE_URL}];
 return [{label:env.POST28_TARGET_LABEL,url:env.DATABASE_URL}];
}

// Native and container labs use the same labels; never fall back to another pair.
export function nativeLabBindings(name,connection){
 localLabProfile(name);
 if(name==='greenfield')return {environment:{GREENFIELD_DATABASE_URL:connection('DB-G'),GREENFIELD_SHADOW_DATABASE_URL:connection('DB-S')},preflightArgs:['--pair']};
 if(name==='upgrade')return {environment:{UPGRADE_DATABASE_URL:connection('DB-U'),UPGRADE_VERIFY_DATABASE_URL:connection('DB-V')},preflightArgs:['--upgrade-pair']};
 return {environment:{},preflightArgs:[]};
}
