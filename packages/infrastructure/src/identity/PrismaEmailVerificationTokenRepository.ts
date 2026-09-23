import { IEmailVerificationTokenRepository, EmailVerificationTokenRecord } from '@manaratak/domain';

export class PrismaEmailVerificationTokenRepository implements IEmailVerificationTokenRepository {
  constructor(private readonly prisma: any) {}

  private get delegate() {
    return this.delegateFor(this.prisma);
  }

  private delegateFor(client: any) {
    if (client && client.emailVerificationTokenRecord) return client.emailVerificationTokenRecord;
    return client?.emailVerificationTokenRecord || client;
  }

  public async save(record: EmailVerificationTokenRecord): Promise<void> {
    await this.delegate.upsert({
      where: { tokenHash: record.tokenHash },
      create: {
        id: record.id,
        identityId: record.identityId,
        tokenHash: record.tokenHash,
        email: record.email,
        expiresAt: record.expiresAt,
        consumedAt: record.consumedAt,
        createdAt: record.createdAt,
      },
      update: {
        consumedAt: record.consumedAt,
      },
    });
  }

  public async findByTokenHash(tokenHash: string): Promise<EmailVerificationTokenRecord | null> {
    const record = await this.delegate.findUnique({
      where: { tokenHash },
    });
    if (!record) return null;
    return {
      id: record.id,
      identityId: record.identityId,
      tokenHash: record.tokenHash,
      email: record.email,
      expiresAt: new Date(record.expiresAt),
      consumedAt: record.consumedAt ? new Date(record.consumedAt) : null,
      createdAt: new Date(record.createdAt),
    };
  }

  public async consume(id: string, consumedAt = new Date()): Promise<void> {
    await this.delegate.update({
      where: { id },
      data: { consumedAt },
    });
  }

  public async invalidatePendingForIdentity(identityId: string): Promise<void> {
    await this.delegate.updateMany({
      where: { identityId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  }
}
