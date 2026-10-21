// Build a diagnostic runtime layer through a separate locked production install.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {npmInvocation,tarLocalPath} from './lib/DiagnosticProcess.mjs';
import {verifyReleaseManifest} from './lib/ReleaseContracts.mjs';
import {verifyRuntimeLayer} from './lib/RuntimeLayerPolicy.mjs';

const repo=fs.realpathSync(process.cwd()),run=fs.realpathSync(process.argv[2]),out=path.join(run,'api-runtime');
const manifest=JSON.parse(fs.readFileSync(path.join(run,'artifacts/release-manifest.json')));
verifyReleaseManifest(path.join(run,'artifacts'),manifest.sourceSha);
if(Number(process.versions.node.split('.')[0])!==22||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==manifest.sourceSha||execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw new Error('POST28_RUNTIME_CLEAN_SOURCE_REQUIRED');
if(run===repo||run.startsWith(repo+path.sep))throw new Error('POST28_RUNTIME_OUTSIDE_CHECKOUT_REQUIRED');
fs.mkdirSync(out);fs.cpSync(path.join(run,'unpacked-api'),out,{recursive:true});
const rows=execFileSync('git',['ls-tree','-r','--name-only',manifest.sourceSha],{encoding:'utf8'}).trim().split('\n').filter(file=>/^(apps|packages)\/[^/]+\/package.json$/.test(file));
for(const relative of rows){fs.mkdirSync(path.dirname(path.join(out,relative)),{recursive:true});fs.writeFileSync(path.join(out,relative),execFileSync('git',['show',`${manifest.sourceSha}:${relative}`]));}
const npm=npmInvocation(['ci','--omit=dev','--ignore-scripts','--no-audit','--no-fund']);
const log=path.join(run,'runtime-install.log'),fd=fs.openSync(log,'wx');
let install;try{install=spawnSync(npm.command,npm.args,{cwd:out,stdio:['ignore',fd,fd],env:process.env});}finally{fs.closeSync(fd);}
if(install.status!==0)throw new Error('POST28_RUNTIME_INSTALL_FAILED');
const digest=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
// Prisma formats its embedded schema. Compare official formatted copies, retaining both raw digests.
const formatted=path.join(run,'formatted-source-schema.prisma');
fs.copyFileSync(path.join(out,'packages/infrastructure/prisma/schema.prisma'),formatted);
execFileSync(process.execPath,['node_modules/prisma/build/index.js','format','--schema',formatted],{stdio:'pipe'});
const generated=path.join(repo,'node_modules/.prisma/client');
if(fs.readFileSync(formatted,'utf8').replace(/\r\n/g,'\n')!==fs.readFileSync(path.join(generated,'schema.prisma'),'utf8').replace(/\r\n/g,'\n'))throw new Error('POST28_RUNTIME_GENERATED_SCHEMA_MISMATCH');
fs.cpSync(generated,path.join(out,'node_modules/.prisma/client'),{recursive:true});
const engineFiles=fs.readdirSync(generated).filter(file=>file.endsWith('.node'));
if(engineFiles.length!==1)throw new Error('POST28_RUNTIME_NATIVE_ENGINE_REQUIRED');
const identity={sourceSha:manifest.sourceSha,node:process.version,nodeMajor:22,os:process.platform,architecture:process.arch,engineFile:engineFiles[0],engineSha256:digest(path.join(generated,engineFiles[0])),generatedSchemaSha256:digest(path.join(generated,'schema.prisma'))};
const verification=verifyRuntimeLayer(out,manifest,identity);
fs.writeFileSync(path.join(out,'runtime-layer.json'),JSON.stringify(identity,null,2)+'\n',{flag:'wx'});
const inspect=directory=>{for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isSymbolicLink()){if(!fs.realpathSync(file).startsWith(out+path.sep))throw new Error('POST28_RUNTIME_LINK_OUTSIDE_LAYER');}else if(entry.isDirectory())inspect(file);else if(!entry.isFile())throw new Error('POST28_RUNTIME_SPECIAL_FILE');}};inspect(out);
const archive=path.join(run,'runtime-layer.tar'),unpack=path.join(run,'api-boot-root');
execFileSync('tar',['--force-local','--dereference','--hard-dereference','--sort=name','--mtime=UTC 1970-01-01','--owner=0','--group=0','--numeric-owner','-cf',tarLocalPath(archive),'-C',tarLocalPath(out),'.'],{stdio:'pipe'});
fs.mkdirSync(unpack);execFileSync('tar',['--force-local','-xf',tarLocalPath(archive),'-C',tarLocalPath(unpack)],{stdio:'pipe'});
const report={kind:'POST28_DIAGNOSTIC_RUNTIME_LAYER',...identity,lockSha256:digest(path.join(out,'package-lock.json')),sourceSchemaSha256:digest(path.join(out,'packages/infrastructure/prisma/schema.prisma')),formattedSourceSchemaSha256:digest(formatted),formattedSchemaMatches:true,installExitCode:install.status,installLogSha256:digest(log),installCommand:[npm.command,...npm.args],verification,runtimeArchiveSha256:digest(archive),runtimeArchiveBytes:fs.statSync(archive).size,freshUnpackVerified:verifyRuntimeLayer(unpack,manifest,identity),generatedClientCopiedFromCleanBuild:true,checkoutPresent:fs.existsSync(path.join(out,'.git')),stageAccepted:false,promotionAuthorized:false};
fs.writeFileSync(path.join(run,'runtime-layer.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
