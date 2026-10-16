import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {validateForwarderTarget,createLoopbackForwarder} from '../../scripts/database/post28-local-forwarder.mjs';
const now=1000000,runId='11111111-1111-4111-8111-111111111111';
const config={version:1,containerId:'a'.repeat(64),runId,network:'post28-net-11111111',port:15432,expiresAt:now+3600000};
const identity=`${runId} DISPOSABLE true`,network=`true ${runId}`;
const networks={[config.network]:{IPAddress:'172.18.0.2'}};
test('forwarder accepts only the new labelled internal Docker target',()=>{
  assert.deepEqual(validateForwarderTarget(config,identity,network,networks,now),{host:'172.18.0.2',port:5432});
});
for(const [name,patch] of [['arbitrary container',{containerId:'other'}],['foreign network',{network:'bridge'}],
  ['public port',{port:5432}],['expired',{expiresAt:now}],['unbounded lifetime',{expiresAt:now+7*3600000}]])
  test(`forwarder rejects ${name}`,()=>assert.throws(()=>validateForwarderTarget({...config,...patch},identity,network,networks,now)));
for(const ip of ['8.8.8.8','127.0.0.1','169.254.169.254','example.com','::1'])
  test(`forwarder rejects address ${ip}`,()=>assert.throws(()=>validateForwarderTarget(config,identity,network,{[config.network]:{IPAddress:ip}},now)));
test('forwarder rejects wrong labels, stopped containers, external networks and absent membership',()=>{
  for(const args of [[identity.replace('DISPOSABLE','PRODUCTION'),network,networks],
    [identity.replace('true','false'),network,networks],[identity,network.replace('true','false'),networks],
    [identity,network,{}]])assert.throws(()=>validateForwarderTarget(config,...args,now));
});
test('actual inert TCP relay binds only loopback and closes its connections',async()=>{
  const upstream=net.createServer(socket=>socket.on('data',data=>socket.write(data)));
  await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
  const relay=createLoopbackForwarder({host:'127.0.0.1',port:upstream.address().port},0);
  try{
    const address=await relay.listen();assert.equal(address.address,'127.0.0.1');
    const reply=await new Promise((resolve,reject)=>{const socket=net.createConnection({host:'127.0.0.1',port:address.port},()=>socket.write('inert'));
      socket.once('error',reject);socket.once('data',data=>{resolve(data.toString());socket.destroy();});});
    assert.equal(reply,'inert');
  }finally{relay.close();await new Promise(resolve=>upstream.close(resolve));}
});
