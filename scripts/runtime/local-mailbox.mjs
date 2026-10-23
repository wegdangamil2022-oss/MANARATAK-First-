import net from 'node:net';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';

// Development SMTP sink: loopback only, no relay, authentication or persistence.
export async function startLocalMailbox({ port = 2525 } = {}) {
  if (process.env.NODE_ENV !== 'development') throw new Error('LOCAL_MAILBOX_REQUIRES_DEVELOPMENT');
  const messages = [], sockets = new Set();
  const server = net.createServer(socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    socket.setTimeout(10000, () => socket.destroy());
    socket.write('220 localhost development sink\r\n');
    let buffer = '', data = false, sender = false, recipient = false;
    socket.on('data', chunk => {
      buffer += chunk.toString('utf8');
      if (Buffer.byteLength(buffer) > 1024 * 1024) return socket.destroy();
      while (true) {
        if (data) {
          const end = buffer.indexOf('\r\n.\r\n');
          if (end < 0) return;
          messages.push(buffer.slice(0, end).replace(/\r\n\.\./g, '\r\n.'));
          if (messages.length > 50) messages.shift();
          buffer = buffer.slice(end + 5);
          data = sender = recipient = false;
          socket.write('250 captured locally; never relayed\r\n');
          continue;
        }
        const end = buffer.indexOf('\r\n');
        if (end < 0) return;
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        if (/^(EHLO|HELO) /i.test(line)) socket.write('250 localhost\r\n');
        else if (/^MAIL FROM:</i.test(line)) { sender = true; recipient = false; socket.write('250 ok\r\n'); }
        else if (/^RCPT TO:</i.test(line) && sender) { recipient = true; socket.write('250 ok\r\n'); }
        else if (/^DATA$/i.test(line) && recipient) { data = true; socket.write('354 end with dot\r\n'); }
        else if (/^QUIT$/i.test(line)) { socket.end('221 bye\r\n'); return; }
        else if (/^RSET$/i.test(line)) { sender = recipient = false; socket.write('250 reset\r\n'); }
        else socket.write('502 unsupported command or sequence\r\n');
      }
    });
  });
  server.listen(port, '127.0.0.1');
  await once(server, 'listening');
  return {
    port: server.address().port,
    getMessages: () => [...messages],
    clear: () => { messages.length = 0; },
    close: async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startLocalMailbox().then(mailbox => {
    console.log(JSON.stringify({ host: '127.0.0.1', port: mailbox.port, externalDelivery: false, persistence: false }));
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await mailbox.close(); });
  }).catch(() => { console.error('LOCAL_MAILBOX_START_FAILED'); process.exitCode = 1; });
}
