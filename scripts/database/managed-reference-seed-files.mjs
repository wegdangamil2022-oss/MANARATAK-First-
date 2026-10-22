import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
export function resolveManagedSeedAsset(root,bucket,locator) {
  const base=path.join(fs.realpathSync(root),bucket)+path.sep;
  const filename=path.resolve(root,locator.bucketName,locator.pathKey);
  if(!/^[a-z0-9-]{3,100}$/.test(bucket)||locator.bucketName!==bucket||!filename.startsWith(base)||
    fs.realpathSync(filename)!==filename||!fs.statSync(filename).isFile()||fs.statSync(filename).size>10*1024*1024)
    throw new Error('MANAGED_SEED_ASSET_PATH_INVALID');
  return filename;
}
export function validateManagedSeedJson(bytes) {
  if(bytes.length>10*1024*1024)throw new Error('MANAGED_SEED_JSON_TOO_LARGE');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),parsed=JSON.parse(text);
  if(!Array.isArray(parsed)||parsed.length>1000||JSON.stringify(parsed)!==text)throw new Error('MANAGED_SEED_JSON_NOT_CANONICAL');
}
export function privateSeedDirectory(configFile,root) {
  const file=fs.realpathSync(configFile),directory=fs.realpathSync(path.dirname(file)),source=fs.realpathSync(root);
  if(directory===source||directory.startsWith(source+path.sep)||file!==path.resolve(configFile))throw new Error('MANAGED_SEED_PRIVATE_DIRECTORY_REQUIRED');
  if(process.platform==='win32'){
    const script="$ErrorActionPreference='Stop';$acl=Get-Acl -LiteralPath $env:MANARATAK_SEED_PRIVATE_DIRECTORY;$sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value;if(-not $acl.AreAccessRulesProtected){throw 'ACL inheritance enabled'};foreach($item in @($acl,(Get-Acl -LiteralPath $env:MANARATAK_SEED_PRIVATE_FILE))){foreach($rule in $item.Access){if($rule.AccessControlType.ToString() -eq 'Allow' -and $rule.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value -notin @($sid,'S-1-5-18')){throw 'Other principal has access'}}};Write-Output 'PRIVATE'";
    const result=execFileSync(path.join(process.env.SystemRoot??'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe'),
      ['-NoProfile','-NonInteractive','-Command',script],{env:{...process.env,MANARATAK_SEED_PRIVATE_DIRECTORY:directory,MANARATAK_SEED_PRIVATE_FILE:file},encoding:'utf8',windowsHide:true,timeout:30000});
    if(result.trim()!=='PRIVATE')throw new Error('MANAGED_SEED_PRIVATE_ACL_REQUIRED');
  }else if(fs.statSync(directory).mode&0o077||fs.statSync(file).mode&0o077)throw new Error('MANAGED_SEED_PRIVATE_MODE_REQUIRED');
  return directory;
}
export function writeSeedEvidence(filename,value) {
  const fd=fs.openSync(filename,'w',0o600);
  try{fs.writeSync(fd,JSON.stringify(value,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
}
