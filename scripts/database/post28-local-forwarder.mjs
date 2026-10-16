import fs from 'node:fs';
import net from 'node:net';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export function validateForwarderTarget(config,identity,network,networks,now=Date.now()) {
  const fail=()=>{throw new Error('POST28_LOCAL_FORWARDER_IDENTITY_REJECTED');};
  if(config?.version!==1||!/^[0-9a-f]{64}$/.test(config.containerId??'')||
      !/^[0-9a-f]{8}-[0-9a-f-]{27}$/.test(config.runId??'')||
      config.network!=='post28-net-'+config.runId.slice(0,8)||
      !Number.isInteger(config.port)||config.port<15432||config.port>15532||
      !Number.isSafeInteger(config.expiresAt)||config.expiresAt<=now||config.expiresAt>now+6*3600000||
      identity!==`${config.runId} DISPOSABLE true`||network!==`true ${config.runId}`)fail();
  const ip=networks?.[config.network]?.IPAddress;
  if(net.isIP(ip??'')!==4)fail();
  const parts=ip.split('.').map(Number);
  if(!(parts[0]===10||parts[0]===172&&parts[1]>=16&&parts[1]<=31||parts[0]===192&&parts[1]===168))fail();
  return {host:ip,port:5432};
}

function resolveTarget(config) {
  const docker=args=>execFileSync('docker',['--host=unix:///var/run/docker.sock',...args],
    {encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:5000}).trim();
  const identity=docker(['inspect',config.containerId,'--format',
    '{{index .Config.Labels "codex.post28.run"}} {{index .Config.Labels "codex.post28.scope"}} {{.State.Running}}']);
  const network=docker(['network','inspect',config.network,'--format','{{.Internal}} {{index .Labels "codex.post28.run"}}']);
  const networks=JSON.parse(docker(['inspect',config.containerId,'--format','{{json .NetworkSettings.Networks}}']));
  return validateForwarderTarget(config,identity,network,networks);
}

export function createLoopbackForwarder(target,port) {
  const sockets=new Set();
  const server=net.createServer(client=>{
    sockets.add(client);client.on('error',()=>client.destroy());client.on('close',()=>sockets.delete(client));
    const upstream=net.createConnection(target);sockets.add(upstream);
    upstream.on('error',()=>{upstream.destroy();client.destroy();});
    upstream.on('close',()=>{sockets.delete(upstream);client.destroy();});
    client.on('close',()=>upstream.destroy());
    client.pipe(upstream);upstream.pipe(client);
  });
  const close=()=>{for(const socket of sockets)socket.destroy();server.close();};
  return {server,close,listen:()=>new Promise((resolve,reject)=>{
    server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve(server.address()));
  })};
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  try {
    const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
    const target=resolveTarget(config),forwarder=createLoopbackForwarder(target,config.port);
    const address=await forwarder.listen();
    console.log(JSON.stringify({kind:'POST28_LOCAL_LOOPBACK_FORWARDER',host:address.address,port:address.port,
      containerId:config.containerId,runId:config.runId,expiresAt:config.expiresAt}));
    const timer=setInterval(()=>{
      try{const fresh=resolveTarget(config);if(fresh.host!==target.host)throw new Error('changed');}
      catch{clearInterval(timer);forwarder.close();process.exitCode=1;}
    },5000);
    const stop=()=>{clearInterval(timer);forwarder.close();};
    process.on('SIGTERM',stop);process.on('SIGINT',stop);
  }catch{console.error('POST28_LOCAL_FORWARDER_FAILED');process.exitCode=1;}
}
