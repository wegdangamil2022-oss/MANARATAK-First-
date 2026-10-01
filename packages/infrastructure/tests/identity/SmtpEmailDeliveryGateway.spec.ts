import { createServer } from 'node:net';
import { once } from 'node:events';
import { describe, expect, it } from 'vitest';
import { SmtpEmailDeliveryGateway } from '../../src/identity/SmtpEmailDeliveryGateway';

describe('SmtpEmailDeliveryGateway', () => {
  it('delivers verification and reset messages to a test SMTP server', async () => {
    const messages: string[] = [];
    const server = createServer(socket => {
      socket.on('error', () => {});
      socket.write('220 test smtp\r\n');
      let buffer = '';
      let dataMode = false;
      socket.on('data', chunk => {
        buffer += chunk.toString();
        while (true) {
          if (dataMode) {
            const end = buffer.indexOf('\r\n.\r\n');
            if (end < 0) return;
            messages.push(buffer.slice(0, end));
            buffer = buffer.slice(end + 5);
            dataMode = false;
            socket.write('250 accepted\r\n');
            continue;
          }
          const end = buffer.indexOf('\r\n');
          if (end < 0) return;
          const line = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          if (line.startsWith('EHLO')) socket.write('250 hello\r\n');
          else if (line.startsWith('DATA')) { dataMode = true; socket.write('354 send data\r\n'); }
          else if (line.startsWith('QUIT')) { socket.write('221 bye\r\n'); socket.end(); }
          else socket.write('250 ok\r\n');
        }
      });
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('SMTP server port unavailable');
      const gateway = new SmtpEmailDeliveryGateway({ host: '127.0.0.1', port: address.port, secure: false, from: 'no-reply@localhost' });
      await gateway.sendVerificationEmail({ email: 'student@example.test', token: 'verify-token', displayName: 'Student' });
      await gateway.sendPasswordResetEmail({ email: 'student@example.test', token: 'reset-token', displayName: 'Student' });
      expect(messages).toHaveLength(2);
      expect(messages[0]).toContain('Verification token: verify-token');
      expect(messages[1]).toContain('Password reset token: reset-token');
    } finally {
      server.close();
    }
  });
});
