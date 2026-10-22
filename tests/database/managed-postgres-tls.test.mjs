import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { verifyManagedPostgresTls } from '../../scripts/database/verify-managed-postgres-tls.mjs';
test('TLS probe sends only PostgreSQL SSLRequest and refuses a plaintext endpoint',async()=>{
  let request;
  const server=net.createServer(socket=>socket.once('data',chunk=>{request=chunk;socket.end('N');}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    await assert.rejects(verifyManagedPostgresTls('postgresql://127.0.0.1:'+server.address().port+'/unused'),/TLS_VERIFICATION_FAILED/);
    assert.equal(request.length,8);assert.equal(request.readInt32BE(0),8);assert.equal(request.readInt32BE(4),80877103);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
