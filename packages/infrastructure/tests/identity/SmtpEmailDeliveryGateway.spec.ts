import { createServer } from 'node:net';
import { once } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SmtpEmailDeliveryGateway } from '../../src/identity/SmtpEmailDeliveryGateway';

describe('SmtpEmailDeliveryGateway', () => {
  afterEach(() => vi.unstubAllEnvs());
  it.each([undefined, 'https://public.example.test'])('uses only injected public URL configuration: %s', async (publicWebUrl) => {
    vi.stubEnv('PUBLIC_WEB_URL', 'https://untrusted.example.test');
    vi.stubEnv('APP_URL', 'https://other.example.test');
    const gateway = new SmtpEmailDeliveryGateway({ host: '127.0.0.1', port: 2525, secure: false, from: 'no-reply@localhost', publicWebUrl });
    const deliver = vi.spyOn(gateway as unknown as { deliver(to: string, subject: string, body: string): Promise<void> }, 'deliver').mockResolvedValue();
    await gateway.sendVerificationEmail({ email: 'student@example.test', token: 'verify-token', displayName: 'Student' });
    await gateway.sendPasswordResetEmail({ email: 'student@example.test', token: 'reset-token', displayName: 'Student' });
    for (const [, , body] of deliver.mock.calls) expect(body).not.toMatch(/untrusted.example|other.example/);
    if (publicWebUrl) {
      expect(deliver.mock.calls[0][2]).toContain(`${publicWebUrl}/verify-email?token=verify-token`);
      expect(deliver.mock.calls[1][2]).toContain(`${publicWebUrl}/reset-password?token=reset-token`);
    } else {
      expect(deliver.mock.calls[0][2]).not.toContain('https://');
      expect(deliver.mock.calls[1][2]).not.toContain('https://');
    }
  });
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
      expect(messages[0]).toMatch(/Verification token:\r?\nverify-token/);
      expect(messages[1]).toMatch(/Password reset token:\r?\nreset-token/);
    } finally {
      server.close();
    }
  });
});
