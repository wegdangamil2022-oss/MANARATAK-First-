import fs from 'node:fs';
import net from 'node:net';
import tls from 'node:tls';

// PostgreSQL SSLRequest, then certificate/hostname-verified TLS. No credentials,
// StartupMessage, authentication, queries or database writes are sent.
// https://www.postgresql.org/docs/16/protocol-message-formats.html#PROTOCOL-MESSAGE-FORMATS-SSLREQUEST
export function verifyManagedPostgresTls(rawUrl) {
  const url=new URL(rawUrl),host=url.hostname,caFile=url.searchParams.get('sslcert'),ca=caFile?fs.readFileSync(caFile):undefined;
  return new Promise((resolve,reject)=>{
    const socket=net.connect({host,port:Number(url.port||5432)});let secure;
    const finish=(error,result)=>{clearTimeout(timer);secure?.destroy();socket.destroy();error?reject(new Error('MANAGED_SEED_TLS_VERIFICATION_FAILED')):resolve(result);};
    const timer=setTimeout(()=>finish(new Error('timeout')),20000);
    socket.once('error',finish);
    socket.once('connect',()=>{const request=Buffer.alloc(8);request.writeInt32BE(8,0);request.writeInt32BE(80877103,4);socket.write(request);});
    socket.once('data',chunk=>{
      if(chunk.length!==1||chunk[0]!==83){finish(new Error('SSLRequest rejected'));return;}
      secure=tls.connect({socket,servername:host,rejectUnauthorized:true,minVersion:'TLSv1.2',...(ca?{ca}:{})});
      secure.once('error',finish);
      secure.once('secureConnect',()=>{
        if(!secure.authorized){finish(new Error('untrusted'));return;}
        finish(null,{host,authorized:true,protocol:secure.getProtocol(),certificateFingerprint256:secure.getPeerCertificate().fingerprint256,verifiedAt:new Date().toISOString()});
      });
    });
  });
}
