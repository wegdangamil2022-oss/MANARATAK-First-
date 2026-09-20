import { Prisma, PrismaClient } from '@prisma/client';
import { RedisClientFactory } from '@manaratak/infrastructure';

/** Separate, short-lived diagnostic resource. The Preview gate and finally-disconnect belong to its caller. */
export function createPreviewProbeClient(url: string) {
  return new PrismaClient({ datasources: { db: { url } }, log: [], errorFormat: 'minimal' });
}
export type PreviewProbeClient = ReturnType<typeof createPreviewProbeClient>;

export function previewProbeModelNames(): string[] {
  return Prisma.dmmf.datamodel.models.map((model) => model.dbName ?? model.name);
}

interface RuntimeConfigReader {
  getOptional?<T = string>(key: string): T | undefined;
}

export interface RuntimeResourceSnapshot {
  readonly prismaCreated: boolean;
  readonly redisCreated: boolean;
  readonly shuttingDown: boolean;
  readonly closed: boolean;
}

/**
 * Process-owned infrastructure lifecycle registry.
 *
 * One API process gets at most one canonical Prisma client and one general-
 * purpose Redis command client. Specialized future transports (for example a
 * BullMQ blocking connection) must be registered explicitly as separately
 * justified resources rather than constructed ad hoc by feature modules.
 */
export class RuntimeResourceRegistry {
  private prismaClient: PrismaClient | null = null;
  private redisClient: any | null = null;
  private shuttingDown = false;
  private closed = false;
  private closePromise: Promise<void> | null = null;

  public constructor(
    private readonly env: Readonly<Record<string, string | undefined>>,
    private readonly config?: RuntimeConfigReader | null,
    private readonly logger?: any,
    private readonly allowExternalConnections = true,
    seededPrismaClient?: PrismaClient | null,
  ) {
    this.prismaClient = seededPrismaClient ?? null;
  }

  public getPrismaClient(): PrismaClient | null {
    if (this.closed) throw new Error('RUNTIME_RESOURCES_ALREADY_CLOSED');
    if (this.prismaClient) return this.prismaClient;
    if (!this.allowExternalConnections) return null;
    const databaseUrl = this.readString('DATABASE_URL');
    if (!databaseUrl) return null;
    if (!this.prismaClient) {
      this.prismaClient = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    }
    return this.prismaClient;
  }

  public getRedisClient(): any | null {
    if (this.closed) throw new Error('RUNTIME_RESOURCES_ALREADY_CLOSED');
    if (!this.allowExternalConnections) return null;
    const redisUrl = this.readString('REDIS_URL');
    if (!redisUrl) return null;
    if (!this.redisClient) {
      this.redisClient = RedisClientFactory.createClient({
        REDIS_URL: redisUrl,
        REDIS_NAMESPACE: this.readString('REDIS_NAMESPACE'),
      }, this.logger);
    }
    return this.redisClient;
  }

  public beginShutdown(): void {
    this.shuttingDown = true;
  }

  public isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  public snapshot(): RuntimeResourceSnapshot {
    return Object.freeze({
      prismaCreated: this.prismaClient !== null,
      redisCreated: this.redisClient !== null,
      shuttingDown: this.shuttingDown,
      closed: this.closed,
    });
  }

  public async closeAll(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    this.shuttingDown = true;
    this.closePromise = (async () => {
      const redis = this.redisClient;
      this.redisClient = null;
      if (redis) {
        try {
          if (redis.isOpen && typeof redis.quit === 'function') await redis.quit();
          else if (typeof redis.disconnect === 'function') await redis.disconnect();
        } catch (error) {
          this.logger?.error?.('[RuntimeResources] Redis shutdown failed', error);
        }
      }

      const prisma = this.prismaClient;
      this.prismaClient = null;
      if (prisma) {
        try { await prisma.$disconnect(); }
        catch (error) { this.logger?.error?.('[RuntimeResources] Prisma shutdown failed', error); }
      }
      this.closed = true;
    })();
    return this.closePromise;
  }

  private readString(key: string): string | undefined {
    const fromConfig = this.config?.getOptional?.<unknown>(key);
    const value = fromConfig ?? this.env[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }
}
