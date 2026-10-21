import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {gatewayHandler, requireLoopbackApiOrigin, assertGatewayReadiness} from '../../scripts/release/serve-artifact-gateway.mjs';

const sha='a'.repeat(40);
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(`http://127.0.0.1:${server.address().port}`)));
const close=server=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve));};
test('gateway refuses remote, credentialed and path-bearing upstream configuration',()=>{
 for(const url of ['https://127.0.0.1:3000','http://localhost:3000','http://example.com','http://127.0.0.1:3000/path','http://u:p@127.0.0.1:3000','http://127.0.0.1:3000/?x=1'])assert.throws(()=>requireLoopbackApiOrigin(url));
 assert.equal(requireLoopbackApiOrigin('http://127.0.0.1:3000').origin,'http://127.0.0.1:3000');
});
test('gateway rejects stale readiness, wrong source and unhealthy status before serving',async()=>{
 let body={protocolVersion:2,status:'UP',code:'AVAILABLE',timestamp:new Date().toISOString()},revision=sha,status=200;
 const api=http.createServer((_q,r)=>{r.writeHead(status,{'content-type':'application/json','x-manaratak-source-sha':revision});r.end(JSON.stringify(body));});const origin=await listen(api);
 try{await assertGatewayReadiness(origin,sha);for(const change of [()=>revision='b'.repeat(40),()=>{revision=sha;status=503;},()=>{status=200;body.timestamp='2000-01-01T00:00:00Z';},()=>body={...body,timestamp:new Date().toISOString(),protocolVersion:1}]){change();await assert.rejects(assertGatewayReadiness(origin,sha));}}finally{await close(api);}
});
test('fixed upstream forwards API method body cookies and preserves Set-Cookie without trusting forwarding headers',async()=>{
 let received;
 const api=http.createServer((req,res)=>{let body='';req.on('data',d=>body+=d);req.on('end',()=>{received={method:req.method,path:req.url,headers:req.headers,body};res.writeHead(200,{'content-type':'application/json','set-cookie':['session=synthetic; Secure; HttpOnly; SameSite=Lax']});res.end('{"ok":true}');});});
 const apiOrigin=await listen(api),gateway=http.createServer(gatewayHandler({apiOrigin,web:(_q,r)=>r.end('WEB'),admin:(_q,r)=>r.end('ADMIN')})),origin=await listen(gateway);
 try{const result=await fetch(origin+'/api/v1/session?mode=test',{method:'POST',headers:{cookie:'session=synthetic','content-type':'application/json','x-forwarded-for':'attacker','x-forwarded-proto':'http'},body:'{"value":1}'});assert.equal(result.status,200);assert.match(result.headers.get('set-cookie'),/Secure; HttpOnly/);await result.text();assert.equal(received.method,'POST');assert.equal(received.path,'/api/v1/session?mode=test');assert.equal(received.body,'{"value":1}');assert.equal(received.headers.cookie,'session=synthetic');assert.equal(received.headers['x-forwarded-proto'],'https');assert.notEqual(received.headers['x-forwarded-for'],'attacker');assert.equal((await fetch(origin+'/')).status,200);assert.equal(await (await fetch(origin+'/admin/')).text(),'ADMIN');assert.equal(await (await fetch(origin+'/admin')).text(),'ADMIN');}finally{await close(gateway);await close(api);}
});
test('gateway fails closed when API is unavailable and never returns SPA HTML',async()=>{
 const unused=http.createServer();const apiOrigin=await listen(unused);await close(unused);
 const gateway=http.createServer(gatewayHandler({apiOrigin,web:(_q,r)=>r.end('WEB'),admin:(_q,r)=>r.end('ADMIN')})),origin=await listen(gateway);
 try{const result=await fetch(origin+'/api/v1/missing');assert.equal(result.status,502);assert.match(result.headers.get('content-type'),/application\/json/);assert.equal((await result.json()).error,'API_UPSTREAM_UNAVAILABLE');}finally{await close(gateway);}
});
