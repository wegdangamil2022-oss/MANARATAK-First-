import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function validateDefenderHealth(health,now=Date.now()) {
  const updated=Date.parse(health?.signatureUpdatedAt);
  if(health?.signatureStatus!=='Valid'||!/(?:^|,\s*)O=Microsoft Corporation(?:,|$)/.test(health.publisher??'')||
    health.serviceEnabled!==true||health.antivirusEnabled!==true||!health.signatureVersion||
    !Number.isFinite(updated)||updated>now+300000||now-updated>72*3600000)throw new Error('DEFENDER_HEALTH_NOT_READY');
  return {signatureVersion:health.signatureVersion,signatureUpdatedAt:health.signatureUpdatedAt};
}
export function validateDefenderScan(result,before,after) {
  if(result.error||result.signal||result.status!==0||!/found no threats\./i.test(result.stdout??'')||
    !/^[a-f0-9]{64}$/.test(before)||before!==after)throw new Error('DEFENDER_SCAN_NOT_CLEAN');
  return true;
}

// Operator-only Windows development adapter. Never installs a service, disables
// protection, remediates files, or replaces the Linux production scanner.
export function createNativeSeedScanner(config) {
  if(process.platform!=='win32'||!path.isAbsolute(config?.executable??'')||
    !/^[a-f0-9]{64}$/.test(config.sha256??''))throw new Error('DEFENDER_IDENTITY_REQUIRED');
  const executable=fs.realpathSync(config.executable);
  const checkBinary=()=>{if(digest(fs.readFileSync(executable))!==config.sha256)throw new Error('DEFENDER_BINARY_CHANGED');};
  checkBinary();
  const script="$ErrorActionPreference='Stop'; $signature=Get-AuthenticodeSignature -LiteralPath $env:MANARATAK_SCANNER_BINARY; $health=Get-MpComputerStatus; [PSCustomObject]@{signatureStatus=$signature.Status.ToString();publisher=$signature.SignerCertificate.Subject;serviceEnabled=$health.AMServiceEnabled;antivirusEnabled=$health.AntivirusEnabled;signatureVersion=$health.AntivirusSignatureVersion;signatureUpdatedAt=$health.AntivirusSignatureLastUpdated.ToUniversalTime().ToString('o')}|ConvertTo-Json -Compress";
  const query=spawnSync(path.join(process.env.SystemRoot??'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe'),
    ['-NoProfile','-NonInteractive','-Command',script],{env:{...process.env,MANARATAK_SCANNER_BINARY:executable},encoding:'utf8',windowsHide:true,timeout:30000});
  if(query.error||query.status!==0)throw new Error('DEFENDER_HEALTH_QUERY_FAILED');
  const verifiedHealth=JSON.parse(query.stdout),health=validateDefenderHealth(verifiedHealth);
  const journal=[];
  return {health,journal,scan(filename){
    checkBinary();validateDefenderHealth(verifiedHealth);
    const before=digest(fs.readFileSync(filename));
    const result=spawnSync(executable,['-Scan','-ScanType','3','-File',filename,'-DisableRemediation'],
      {encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:1024*1024});
    const after=digest(fs.readFileSync(filename));
    validateDefenderScan(result,before,after);
    const receipt={provider:'WINDOWS_DEFENDER',sha256:before,exitCode:result.status,digestUnchanged:true,clean:true,...health};
    journal.push(receipt);return receipt;
  }};
}
