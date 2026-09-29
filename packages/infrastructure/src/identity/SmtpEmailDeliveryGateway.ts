import { createConnection } from 'node:net';
import { connect as connectTls } from 'node:tls';
import { createInterface } from 'node:readline';
import type { IEmailDeliveryGateway, SendVerificationEmailInput, SendPasswordResetEmailInput } from '@manaratak/domain';

export interface SmtpEmailConfig { host: string; port: number; secure: boolean; from: string; username?: string; password?: string; publicWebUrl?: string; }

function safeHeader(value: string): string { return value.replace(/[\r\n]/g, ' ').trim(); }

export class SmtpEmailDeliveryGateway implements IEmailDeliveryGateway {
  constructor(private readonly config: SmtpEmailConfig) {
    if (!config.host || !config.from || !Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
      throw new Error('Test SMTP configuration is incomplete');
    }
    if (Boolean(config.username) !== Boolean(config.password)) throw new Error('Test SMTP credentials must be supplied together');
    if (!config.secure && config.username) throw new Error('Test SMTP authentication requires TLS');
    if (!config.secure && !['localhost', '127.0.0.1', '::1', 'mailpit'].includes(config.host.toLowerCase())) {
      throw new Error('Unencrypted test SMTP is allowed only on the local development network');
    }
  }

  sendVerificationEmail(input: SendVerificationEmailInput): Promise<void> {
    const rawBaseUrl = this.config.publicWebUrl || process.env.PUBLIC_WEB_URL || process.env.APP_URL || '';
    const baseUrl = rawBaseUrl.replace(/\/$/, '');
    const verificationUrl = baseUrl ? `${baseUrl}/verify-email?token=${encodeURIComponent(input.token)}` : '';
    const linkSection = verificationUrl
      ? `\nVerification link (click to verify directly):\n${verificationUrl}\n`
      : '';
    const body = `Hello ${input.displayName},\n\n` +
      `Thank you for registering with MANARATAK.\n\n` +
      `Verification token:\n${input.token}\n` +
      linkSection +
      `\nYou can also verify your account by visiting the verification page and entering your token:\n` +
      `${baseUrl ? `${baseUrl}/verify-email` : '/verify-email'}\n`;
    return this.deliver(input.email, 'Verify your MANARATAK email', body);
  }

  sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<void> {
    const rawBaseUrl = this.config.publicWebUrl || process.env.PUBLIC_WEB_URL || process.env.APP_URL || '';
    const baseUrl = rawBaseUrl.replace(/\/$/, '');
    const resetUrl = baseUrl ? `${baseUrl}/reset-password?token=${encodeURIComponent(input.token)}` : '';
    const linkSection = resetUrl
      ? `\nPassword reset link:\n${resetUrl}\n`
      : '';
    const body = `Hello ${input.displayName},\n\n` +
      `Password reset token:\n${input.token}\n` +
      linkSection;
    return this.deliver(input.email, 'Reset your MANARATAK password', body);
  }

  private async deliver(to: string, subject: string, body: string): Promise<void> {
    const { host, port, secure, from } = this.config;
    const socket = secure ? connectTls({ host, port, servername: host, rejectUnauthorized: true }) : createConnection({ host, port });
    socket.setTimeout(5000, () => socket.destroy(new Error('SMTP timeout')));
    const lines = createInterface({ input: socket, crlfDelay: Infinity })[Symbol.asyncIterator]();
    try {
      await new Promise<void>((resolve, reject) => {
        socket.once(secure ? 'secureConnect' : 'connect', resolve);
        socket.once('error', reject);
      });
      const response = async (expected: number) => {
        let code = 0;
        while (true) {
          const next = await lines.next();
          if (next.done) throw new Error('SMTP connection closed');
          const match = /^(\d{3})([ -])/.exec(next.value);
          if (!match) throw new Error('Invalid SMTP response');
          code = Number(match[1]);
          if (match[2] === ' ') break;
        }
        if (code !== expected) throw new Error(`SMTP rejected request (${code})`);
      };
      const command = async (value: string, expected: number) => { socket.write(`${value}\r\n`); await response(expected); };
      await response(220);
      await command('EHLO manaratak.local', 250);
      if (this.config.username && this.config.password) {
        const credential = Buffer.from(`\0${this.config.username}\0${this.config.password}`, 'utf8').toString('base64');
        await command(`AUTH PLAIN ${credential}`, 235);
      }
      const address = /<([^>]+)>/.exec(from)?.[1] ?? from;
      await command(`MAIL FROM:<${safeHeader(address)}>`, 250);
      await command(`RCPT TO:<${safeHeader(to)}>`, 250);
      await command('DATA', 354);
      const message = [`From: ${safeHeader(from)}`, `To: ${safeHeader(to)}`, `Subject: ${safeHeader(subject)}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', '', body]
        .join('\r\n').replace(/\r?\n\./g, '\r\n..');
      await command(`${message}\r\n.`, 250);
      await command('QUIT', 221);
    } catch {
      throw new Error('Test SMTP delivery failed');
    } finally {
      socket.destroy();
    }
  }
}
