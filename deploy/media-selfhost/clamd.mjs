import net from 'node:net';
/** INSTREAM sends bytes, not server-side paths. Missing/outdated engines never report clean. */
export async function clamCommand(host, port, command, bytes) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    const chunks = [];
    let size = 0;
    socket.setTimeout(45000, () => socket.destroy(Error('SCANNER_TIMEOUT')));
    socket.on('error', reject);
    socket.on('data', (chunk) => {
      size += chunk.length;
      if (size > 8192) {
        socket.destroy(Error('SCANNER_RESPONSE_LIMIT'));
        return;
      }
      chunks.push(chunk);
    });
    socket.on('end', () => resolve(Buffer.concat(chunks).toString('utf8').replace(/\0$/, '')));
    socket.once('connect', () => {
      socket.write(`z${command}\0`);
      if (bytes) {
        for (let offset = 0; offset < bytes.length; offset += 65536) {
          const chunk = bytes.subarray(offset, offset + 65536),
            length = Buffer.alloc(4);
          length.writeUInt32BE(chunk.length);
          socket.write(length);
          socket.write(chunk);
        }
        socket.write(Buffer.alloc(4));
      }
    });
  });
}
export async function scanBytes(
  bytes,
  { host = 'clamd', port = 3310, maxDatabaseAgeHours = 48 } = {},
) {
  const version = await clamCommand(host, port, 'VERSION');
  // ClamAV VERSION: ClamAV engine/signature-version/database-timestamp.
  const date = Date.parse(version.split('/').slice(2).join('/'));
  if (
    !Number.isFinite(date) ||
    Date.now() - date > maxDatabaseAgeHours * 3600000 ||
    date > Date.now() + 3600000
  )
    throw Error('SCANNER_DATABASE_STALE');
  const result = await clamCommand(host, port, 'INSTREAM', bytes);
  if (result === 'stream: OK') return { clean: true, threatsFound: [], engine: version };
  if (result.startsWith('stream: ') && result.endsWith(' FOUND'))
    return { clean: false, threatsFound: [result.slice(8, -6)], engine: version };
  throw Error('SCANNER_FAILED');
}
