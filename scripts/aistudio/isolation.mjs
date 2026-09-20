import { register, syncBuiltinESMExports } from 'node:module';
import net from 'node:net';
import tls from 'node:tls';

register('./reject-backend.mjs', import.meta.url);
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const value = Array.isArray(args[0]) ? args[0][0] : args[0];
  const host = typeof value === 'object' && value ? value.host : args[1];
  const port = typeof value === 'object' && value ? value.port : value;
  if (!['127.0.0.1', 'localhost', '::1'].includes(host) || [5432, 6543, 6379].includes(Number(port))) {
    throw new Error('AI_STUDIO_EXTERNAL_CONNECTION_FORBIDDEN');
  }
  return connect.apply(this, args);
};
tls.connect = () => { throw new Error('AI_STUDIO_EXTERNAL_CONNECTION_FORBIDDEN'); };
globalThis.fetch = () => { throw new Error('AI_STUDIO_EXTERNAL_CONNECTION_FORBIDDEN'); };
syncBuiltinESMExports();
