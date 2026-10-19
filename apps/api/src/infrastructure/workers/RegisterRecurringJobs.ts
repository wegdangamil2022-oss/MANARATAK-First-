import { ASSET_LIFECYCLE_RECOVERY_JOB_TYPE } from '@absheer/application';
import { AUDIT_ALERT_EVALUATION_JOB_TYPE } from '@absheer/application';
import { CAREER_MAINTENANCE_JOB_TYPE, SERVICE_MAINTENANCE_JOB_TYPE, ASSET_ACTIVATION_RECOVERY_JOB_TYPE, RETENTION_SWEEP_JOB_TYPE, CMS_SCHEDULED_PUBLISH_JOB_TYPE, IMPORT_QUEUE_SWEEP_JOB_TYPE, AI_ASYNC_SWEEP_JOB_TYPE, FINANCE_RECONCILIATION_JOB_TYPE, NOTIFICATION_DELIVERY_JOB_TYPE } from '@absheer/application';
import type { AwilixContainer } from '@absheer-vendor/awilix-core';
import type { IConfigurationService } from '@absheer/core';

/** Idempotent definitions; the durable queue owns scheduling, leases, retry and DLQ. */
export async function registerRecurringJobs(container: AwilixContainer, config: IConfigurationService): Promise<void> {
  const backgroundWorkerEnabled = config.getOptional<boolean>('BACKGROUND_WORKER_ENABLED') === true;
  if (backgroundWorkerEnabled) {
    const manager = container.resolve<any>('manageBackgroundJobsUseCase');
    if (config.getOptional<boolean>('ASSET_LIFECYCLE_RECOVERY_ENABLED') === true) {
      await manager.ensureRecurringJob({ stableReference:'system.assets.lifecycle-recovery',jobType:ASSET_LIFECYCLE_RECOVERY_JOB_TYPE,parameters:{limit:25,minimumAgeSeconds:300},cronExpression:'*/5 * * * *',priority:90,timeoutSeconds:300,maxAttempts:5,backoffType:'exponential',ownerReference:'assets:lifecycle-recovery' });
    }
    if (config.getOptional<boolean>('AUDIT_ALERTS_ENABLED') === true) {
      await manager.ensureRecurringJob({ stableReference: 'system.audit.alerts', jobType: AUDIT_ALERT_EVALUATION_JOB_TYPE, parameters: { limit: 25 }, cronExpression: '* * * * *', priority: 75, timeoutSeconds: 300, maxAttempts: 5, backoffType: 'exponential', ownerReference: 'audit:alerts' });
    }
    if (config.getOptional<boolean>('ASSET_ACTIVATION_RECOVERY_ENABLED') === true) {
      await manager.ensureRecurringJob({ stableReference: 'system.assets.activation-recovery',
        jobType: ASSET_ACTIVATION_RECOVERY_JOB_TYPE, parameters: { limit: 25, minimumAgeSeconds: 300 },
        cronExpression: config.get<string>('ASSET_ACTIVATION_RECOVERY_CRON'), priority: 90,
        timeoutSeconds: 300, maxAttempts: 5, backoffType: 'exponential', ownerReference: 'assets:activation-recovery' });
    }
    await manager.ensureRecurringJob({
      stableReference: 'system.retention.sweep',
      jobType: RETENTION_SWEEP_JOB_TYPE,
      parameters: { limitPerOwner: 100 },
      cronExpression: config.getOptional<string>('BACKGROUND_RETENTION_CRON') || '15 2 * * *',
      priority: 100,
      timeoutSeconds: 600,
      maxAttempts: 5,
      backoffType: 'exponential',
      ownerReference: 'platform:retention',
    });
    await manager.ensureRecurringJob({ stableReference: 'system.cms.scheduled-publishing', jobType: CMS_SCHEDULED_PUBLISH_JOB_TYPE, parameters: { limit: 50 }, cronExpression: config.getOptional<string>('BACKGROUND_CMS_CRON') || '* * * * *', priority: 90, timeoutSeconds: 120, maxAttempts: 5, backoffType: 'exponential', ownerReference: 'cms:scheduled-publishing' });
    await manager.ensureRecurringJob({ stableReference: 'system.import.queue-sweep', jobType: IMPORT_QUEUE_SWEEP_JOB_TYPE, parameters: { maxJobs: 10 }, cronExpression: config.getOptional<string>('BACKGROUND_IMPORT_CRON') || '* * * * *', priority: 80, timeoutSeconds: 300, maxAttempts: 5, backoffType: 'exponential', ownerReference: 'imports:durable-queue' });
    await manager.ensureRecurringJob({ stableReference: 'system.ai.async-sweep', jobType: AI_ASYNC_SWEEP_JOB_TYPE, parameters: { limit: 10 }, cronExpression: config.getOptional<string>('BACKGROUND_AI_CRON') || '* * * * *', priority: 80, timeoutSeconds: 600, maxAttempts: 5, backoffType: 'exponential', ownerReference: 'ai:async-queue' });
    await manager.ensureRecurringJob({ stableReference: 'system.finance.reconciliation', jobType: FINANCE_RECONCILIATION_JOB_TYPE, parameters: { limit: 50 }, cronExpression: config.getOptional<string>('BACKGROUND_FINANCE_RECONCILIATION_CRON') || '*/5 * * * *', priority: 95, timeoutSeconds: 600, maxAttempts: 5, backoffType: 'exponential', ownerReference: 'finance:reconciliation' });
    if (config.getOptional<boolean>('CAREERS_MAINTENANCE_ENABLED') === true) await manager.ensureRecurringJob({ stableReference: 'system.careers.maintenance', jobType: CAREER_MAINTENANCE_JOB_TYPE, parameters: { limit: 50 }, cronExpression: '*/5 * * * *', priority: 80, timeoutSeconds: 120, maxAttempts: 5, backoffType: 'exponential', ownerReference: 'careers:maintenance' });
    if(config.getOptional<boolean>('SERVICES_MAINTENANCE_ENABLED')===true) await manager.ensureRecurringJob({stableReference:'system.services.maintenance',jobType:SERVICE_MAINTENANCE_JOB_TYPE,parameters:{limit:50},cronExpression:'*/5 * * * *',priority:85,timeoutSeconds:120,maxAttempts:5,backoffType:'exponential',ownerReference:'services:maintenance'});
    await manager.ensureRecurringJob({ stableReference: 'system.notification.delivery', jobType: NOTIFICATION_DELIVERY_JOB_TYPE, parameters: { limit: 20, leaseMs: 600_000, maxDeliveriesPerRecipientPerHour: config.getOptional<number>('NOTIFICATION_RECIPIENT_MAX_DELIVERIES_PER_HOUR') ?? 30 }, cronExpression: config.getOptional<string>('BACKGROUND_NOTIFICATION_CRON') || '* * * * *', priority: 85, timeoutSeconds: 300, maxAttempts: 5, backoffType: 'exponential', ownerReference: 'notifications:delivery' });
  }

}
