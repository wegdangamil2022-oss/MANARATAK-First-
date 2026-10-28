import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { AtomicPersistenceContext } from '@manaratak/domain';
import type { IMfaGateway, MfaProof } from '@manaratak/application';
import { encodeBase32, matchingStep } from './Totp';
interface Envelope {
  version: 1;
  iv: string;
  tag: string;
  ciphertext: string;
  lastStep: number;
  confirmed: boolean;
  createdAt: string;
  enrollmentId: string;
}
interface Proof {
  verifiedAt: string;
  enrollmentId: string;
  sessionHash: string;
}
/** Identity-owned credential records; no password credential is modified or exposed. */
export class PrismaMfaGateway implements IMfaGateway {
  constructor(
    private readonly db: PrismaClient,
    private readonly encryptionKey?: string,
  ) {}
  private client(context: AtomicPersistenceContext): Prisma.TransactionClient {
    const tx = (
      context as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }
    ).transactionClient;
    if (!context.boundaryId || !tx) throw new Error('MFA_TRANSACTION_REQUIRED');
    return tx;
  }
  private key() {
    if (!this.encryptionKey || !/^[a-fA-F0-9]{64}$/.test(this.encryptionKey))
      throw new Error('MFA_ENCRYPTION_UNAVAILABLE');
    return Buffer.from(this.encryptionKey, 'hex');
  }
  private encrypt(identityId: string, secret: string): Pick<Envelope, 'iv' | 'tag' | 'ciphertext'> {
    const iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    cipher.setAAD(Buffer.from(identityId));
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return {
      iv: iv.toString('hex'),
      tag: cipher.getAuthTag().toString('hex'),
      ciphertext: ciphertext.toString('hex'),
    };
  }
  private decrypt(identityId: string, value: Envelope) {
    const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(value.iv, 'hex'));
    decipher.setAAD(Buffer.from(identityId));
    decipher.setAuthTag(Buffer.from(value.tag, 'hex'));
    return Buffer.concat([
      decipher.update(Buffer.from(value.ciphertext, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  }
  private parse(value: string): Envelope {
    const e = JSON.parse(value) as Envelope;
    if (
      e.version !== 1 ||
      typeof e.iv !== 'string' ||
      !/^[a-f0-9]{24}$/.test(e.iv) ||
      typeof e.tag !== 'string' ||
      !/^[a-f0-9]{32}$/.test(e.tag) ||
      typeof e.ciphertext !== 'string' ||
      !/^[a-f0-9]+$/.test(e.ciphertext) ||
      !Number.isFinite(Date.parse(e.createdAt)) ||
      Date.parse(e.createdAt) > Date.now() ||
      !Number.isInteger(e.lastStep) ||
      !e.enrollmentId ||
      typeof e.confirmed !== 'boolean'
    )
      throw new Error('MFA_CREDENTIAL_INVALID');
    return e;
  }
  async enabled(identityId: string) {
    const row = await this.db.credentialRecord.findUnique({
      where: { identityId_type: { identityId, type: 'TOTP' } },
    });
    return !!row && !row.disabled && this.parse(row.passwordHash).confirmed;
  }
  async begin(identityId: string, context: AtomicPersistenceContext) {
    const db = this.client(context);
    await db.$queryRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`identity-mfa:${identityId}`},0))::text AS lock_result`,
    );
    const existing = await db.credentialRecord.findUnique({
      where: { identityId_type: { identityId, type: 'TOTP' } },
    });
    if (existing && !existing.disabled && this.parse(existing.passwordHash).confirmed)
      throw new Error('MFA_ALREADY_ENABLED');
    const secret = encodeBase32(randomBytes(20));
    const envelope: Envelope = {
      version: 1,
      ...this.encrypt(identityId, secret),
      lastStep: -1,
      confirmed: false,
      createdAt: new Date().toISOString(),
      enrollmentId: randomBytes(16).toString('hex'),
    };
    await db.credentialRecord.upsert({
      where: { identityId_type: { identityId, type: 'TOTP' } },
      create: { identityId, type: 'TOTP', passwordHash: JSON.stringify(envelope) },
      update: { disabled: false, passwordHash: JSON.stringify(envelope) },
    });
    return {
      secret,
      provisioningUri: `otpauth://totp/MANARATAK:${encodeURIComponent(identityId)}?secret=${secret}&issuer=MANARATAK&algorithm=SHA1&digits=6&period=30`,
    };
  }
  async confirm(identityId: string, code: string, context: AtomicPersistenceContext) {
    await this.check(identityId, code, context, true);
  }
  async consume(identityId: string, code: string, context: AtomicPersistenceContext) {
    return this.check(identityId, code, context, false);
  }
  private async check(
    identityId: string,
    code: string,
    context: AtomicPersistenceContext,
    enrolling: boolean,
  ) {
    const db = this.client(context);
    await db.$queryRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`identity-mfa:${identityId}`},0))::text AS lock_result`,
    );
    await db.$queryRaw(
      Prisma.sql`SELECT id FROM "CredentialRecord" WHERE "identityId"=${identityId} AND type='TOTP' FOR UPDATE`,
    );
    const row = await db.credentialRecord.findUnique({
      where: { identityId_type: { identityId, type: 'TOTP' } },
    });
    if (!row || row.disabled) throw new Error('MFA_CODE_INVALID');
    const envelope = this.parse(row.passwordHash);
    if (
      enrolling
        ? envelope.confirmed || Date.now() - Date.parse(envelope.createdAt) > 10 * 60_000
        : !envelope.confirmed
    )
      throw new Error('MFA_CODE_INVALID');
    const step = matchingStep(
      this.decrypt(identityId, envelope),
      code,
      new Date(),
      envelope.lastStep,
    );
    await db.credentialRecord.update({
      where: { id: row.id },
      data: { passwordHash: JSON.stringify({ ...envelope, lastStep: step, confirmed: true }) },
    });
    return { enrollmentId: envelope.enrollmentId, verifiedAt: new Date().toISOString() };
  }
  async disable(identityId: string, context: AtomicPersistenceContext) {
    const db = this.client(context);
    await db.$queryRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`identity-mfa:${identityId}`},0))::text AS lock_result`,
    );
    await db.credentialRecord.update({
      where: { identityId_type: { identityId, type: 'TOTP' } },
      data: { disabled: true },
    });
    await db.credentialRecord.deleteMany({
      where: { identityId, type: { startsWith: 'MFA_PROOF:' } },
    });
  }
  private proofType(sessionId: string) {
    return 'MFA_PROOF:' + createHash('sha256').update(sessionId).digest('hex');
  }
  async markProof(identityId: string, sessionId: string, verification: MfaProof) {
    const enrolled = await this.db.credentialRecord.findUnique({
      where: { identityId_type: { identityId, type: 'TOTP' } },
    });
    if (
      !enrolled ||
      enrolled.disabled ||
      !this.parse(enrolled.passwordHash).confirmed ||
      this.parse(enrolled.passwordHash).enrollmentId !== verification.enrollmentId ||
      !Number.isFinite(Date.parse(verification.verifiedAt)) ||
      Date.parse(verification.verifiedAt) > Date.now() ||
      Date.parse(verification.verifiedAt) < Date.now() - 10 * 60_000
    )
      throw new Error('MFA_SESSION_REQUIRED');
    const type = this.proofType(sessionId),
      proof: Proof = {
        verifiedAt: verification.verifiedAt,
        enrollmentId: verification.enrollmentId,
        sessionHash: type.slice(10),
      };
    await this.db.credentialRecord.upsert({
      where: { identityId_type: { identityId, type } },
      create: { identityId, type, passwordHash: JSON.stringify(proof) },
      update: { disabled: false, passwordHash: JSON.stringify(proof) },
    });
  }
  async sessionProofValid(identityId: string, sessionId: string) {
    return this.checkProof(identityId, sessionId, false);
  }
  async sessionAuthenticationAllowed(identityId: string, sessionId: string) {
    const type = this.proofType(sessionId);
    // One snapshot per request; no cross-request cache of enrollment or session proof.
    const rows = await this.db.credentialRecord.findMany({
      where: { identityId, type: { in: ['TOTP', type] } },
      select: { type: true, passwordHash: true, disabled: true },
      take: 2,
    });
    const enrolled = rows.find((row) => row.type === 'TOTP');
    if (!enrolled || enrolled.disabled) return true;
    const enrollment = this.parse(enrolled.passwordHash);
    if (!enrollment.confirmed) return true;
    const proof = rows.find((row) => row.type === type);
    return (
      !!proof && !proof.disabled && this.validProof(proof.passwordHash, enrollment, type, false)
    );
  }
  async proofIsFresh(identityId: string, sessionId: string) {
    return this.checkProof(identityId, sessionId, true);
  }
  private async checkProof(identityId: string, sessionId: string, fresh: boolean) {
    const [proof, enrolled] = await Promise.all([
      this.db.credentialRecord.findUnique({
        where: { identityId_type: { identityId, type: this.proofType(sessionId) } },
      }),
      this.db.credentialRecord.findUnique({
        where: { identityId_type: { identityId, type: 'TOTP' } },
      }),
    ]);
    if (!proof || proof.disabled || !enrolled || enrolled.disabled) return false;
    return this.validProof(
      proof.passwordHash,
      this.parse(enrolled.passwordHash),
      this.proofType(sessionId),
      fresh,
    );
  }
  private validProof(value: string, enrollment: Envelope, type: string, fresh: boolean) {
    const p = JSON.parse(value) as Proof;
    return (
      enrollment.confirmed &&
      p.enrollmentId === enrollment.enrollmentId &&
      p.sessionHash === type.slice(10) &&
      Date.parse(p.verifiedAt) <= Date.now() &&
      (!fresh || Date.parse(p.verifiedAt) > Date.now() - 10 * 60_000)
    );
  }
  async copyProof(identityId: string, from: string, to: string) {
    if (!(await this.enabled(identityId))) return;
    if (!(await this.sessionProofValid(identityId, from))) throw new Error('MFA_SESSION_REQUIRED');
    const row = await this.db.credentialRecord.findUniqueOrThrow({
      where: { identityId_type: { identityId, type: this.proofType(from) } },
    });
    const proof = JSON.parse(row.passwordHash) as Proof,
      type = this.proofType(to);
    await this.db.credentialRecord.create({
      data: {
        identityId,
        type,
        passwordHash: JSON.stringify({ ...proof, sessionHash: type.slice(10) }),
      },
    }); // Freshness is never extended by refresh.
  }
}
