import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {staticArtifactHandler} from '../../scripts/release/serve-static-artifact.mjs';
const sha='a'.repeat(40);
test('artifact handler serves actual assets and refuses API/asset fallback and revision drift',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'post28-static-host-'));
  fs.mkdirSync(path.join(root,'assets'));
  fs.writeFileSync(path.join(root,'assets/app.js'),'export {};');
  fs.writeFileSync(path.join(root,'assets/app.css'),'body {}');
  fs.writeFileSync(path.join(root,'index.html'),`<meta name="manaratak-build-sha" content="${sha}"><div id="root"></div><script src="/admin/assets/app.js"></script>`);
  fs.writeFileSync(path.join(root,'manaratak-build.json'),JSON.stringify({version:1,unit:'admin',sourceSha:sha}));
  const server=http.createServer(staticArtifactHandler({directory:root,unit:'admin',sourceSha:sha}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try {
    for(const [route,status,type] of [['/admin/',200,'text/html'],['/admin/assets/app.js',200,'application/javascript'],['/admin/assets/app.css',200,'text/css'],['/admin/missing.js',404,'application/json'],['/api/v1/monitoring/health/readiness',503,'application/json'],['/admin/health/build',200,'application/json'],['/',404,'application/json']]) {
      const response=await fetch(base+route,{redirect:'manual'});assert.equal(response.status,status,route);assert.ok(response.headers.get('content-type').startsWith(type),route);await response.text();
    }
    assert.throws(()=>staticArtifactHandler({directory:root,unit:'admin',sourceSha:'b'.repeat(40)}),/BUILD_INVALID/);
    fs.rmSync(path.join(root,'assets/app.js'));
    assert.equal((await fetch(base+'/admin/health/build')).status,503);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(root,{recursive:true,force:true});}
});
