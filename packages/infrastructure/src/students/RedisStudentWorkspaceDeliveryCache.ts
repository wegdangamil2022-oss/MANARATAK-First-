import { IStudentWorkspaceDeliveryCache, StudentDashboardSummaryDto } from '@manaratak/domain';

interface RedisWorkspaceClient {
  isReady: boolean;
  buildKey(feature: string, key: string): string;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { EX: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
  publish(channel: string, message: string): Promise<unknown>;
}

export class RedisStudentWorkspaceDeliveryCache implements IStudentWorkspaceDeliveryCache {
  public constructor(private readonly client: RedisWorkspaceClient, private readonly ttlSeconds = 60) {}

  public async getDashboard(studentReferenceId: string): Promise<StudentDashboardSummaryDto | null> {
    if (!this.client.isReady) return null;
    try {
      const value = await this.client.get(this.dashboardKey(studentReferenceId));
      return value ? (JSON.parse(value) as StudentDashboardSummaryDto) : null;
    } catch { return null; }
  }

  public async setDashboard(studentReferenceId: string, dashboard: StudentDashboardSummaryDto): Promise<void> {
    if (!this.client.isReady) return;
    try { await this.client.set(this.dashboardKey(studentReferenceId), JSON.stringify(dashboard), { EX: this.ttlSeconds }); }
    catch { /* Relational persistence remains canonical when Redis is unavailable. */ }
  }

  public async invalidate(studentReferenceId: string, reason: string): Promise<void> {
    if (!this.client.isReady) return;
    try {
      await this.client.del(this.dashboardKey(studentReferenceId));
      await this.client.publish(this.channelKey(studentReferenceId), JSON.stringify({ type: 'StudentWorkspaceInvalidated', studentReferenceId, reason, occurredAt: new Date().toISOString() }));
    } catch { /* Cache and cross-device notification fail open without affecting writes. */ }
  }

  private dashboardKey(studentReferenceId: string): string {
    return this.client.buildKey('student-workspace', `${encodeURIComponent(studentReferenceId)}:dashboard:v1`);
  }

  private channelKey(studentReferenceId: string): string {
    return this.client.buildKey('student-workspace-events', encodeURIComponent(studentReferenceId));
  }
}
